"""
PrintForge Printer Agent (Python)

Watches Firestore "printJobs" collection for status == "queued",
downloads the model file from Firebase Storage, and sends it to the
Flashforge M5 using the flashforge-python-api library.

Usage:
    python agent.py

Requires .env (copy from .env.example and fill in values).
"""

import asyncio
import os
import tempfile
import logging
from pathlib import Path

import aiohttp
from dotenv import load_dotenv
from flashforge import FlashForgeClient
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import AsyncClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("printforge-agent")

# ── Config ────────────────────────────────────────────────────────────────────

PRINTER_IP           = os.environ["PRINTER_IP"]
PRINTER_SERIAL       = os.environ["PRINTER_SERIAL"]
PRINTER_CHECK_CODE   = os.environ["PRINTER_CHECK_CODE"]
SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccount.json")

# ── Firebase init ─────────────────────────────────────────────────────────────

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db: AsyncClient = firestore.AsyncClient()

# ── Download helper ───────────────────────────────────────────────────────────

async def download_file(url: str, dest: Path) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.content.iter_chunked(1024 * 64):
                    f.write(chunk)

# ── Process a single print job ────────────────────────────────────────────────

async def process_job(job_ref, job: dict) -> None:
    job_id = job_ref.id
    log.info(f"[{job_id}] Starting: {job['productName']} ({job['fileName']})")
    log.info(f"  Order: {job['orderId']} | Material: {job['requestedMaterial']} | "
             f"Color: {job.get('requestedColor', 'any')} | Infill: {job['infillPercent']}%")

    with tempfile.TemporaryDirectory() as tmpdir:
        local_path = Path(tmpdir) / job["fileName"]

        try:
            # Mark as downloading
            await job_ref.update({"status": "downloading", "startedAt": firestore.SERVER_TIMESTAMP})

            log.info("  Downloading from Firebase Storage…")
            await download_file(job["fileUrl"], local_path)
            log.info(f"  Download complete ({local_path.stat().st_size / 1024:.1f} KB)")

            # Connect to printer and upload
            await job_ref.update({"status": "uploading"})
            log.info(f"  Connecting to printer at {PRINTER_IP}…")

            async with FlashForgeClient(PRINTER_IP, PRINTER_SERIAL, PRINTER_CHECK_CODE) as client:
                if not await client.initialize():
                    raise RuntimeError("Printer initialize() returned False — check IP/serial/check_code")

                await client.init_control()

                status = await client.get_printer_status()
                log.info(f"  Printer state: {status.machine_state if status else 'unknown'}")

                log.info("  Uploading file and starting print…")
                await job_ref.update({"status": "printing"})

                success = await client.control.upload_file(
                    str(local_path),
                    start_print=True,
                    level_before_print=False,
                )

            if not success:
                raise RuntimeError("upload_file() returned False — printer may have rejected the file")

            # Mark done
            await job_ref.update({"status": "done", "finishedAt": firestore.SERVER_TIMESTAMP})
            await db.collection("orders").document(job["orderId"]).update({"printStatus": "printing"})
            log.info(f"[{job_id}] Print started successfully!")

        except Exception as err:
            log.error(f"[{job_id}] FAILED: {err}")
            await job_ref.update({
                "status": "failed",
                "error": str(err),
                "finishedAt": firestore.SERVER_TIMESTAMP,
            })
            await db.collection("orders").document(job["orderId"]).update({"printStatus": "failed"})

# ── Job queue ─────────────────────────────────────────────────────────────────

processing = False

async def check_for_jobs() -> None:
    global processing
    if processing:
        return

    snap = await (
        db.collection("printJobs")
        .where("status", "==", "queued")
        .order_by("createdAt")
        .limit(1)
        .get()
    )

    if not snap:
        return

    processing = True
    try:
        doc = snap[0]
        await process_job(doc.reference, doc.to_dict())
    finally:
        processing = False

# ── Real-time Firestore listener ──────────────────────────────────────────────

def on_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name == "ADDED":
            log.info("New print job detected — picking up…")
            asyncio.create_task(check_for_jobs())

# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("PrintForge Printer Agent started.")
    log.info(f"  Printer: {PRINTER_IP} (serial: {PRINTER_SERIAL})")
    log.info("  Watching Firestore for print jobs…")

    # Real-time listener for instant pickup
    query = db.collection("printJobs").where("status", "==", "queued")
    query.on_snapshot(on_snapshot)

    # Fallback poll every 30 s (catches anything the listener missed)
    while True:
        await check_for_jobs()
        await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(main())
