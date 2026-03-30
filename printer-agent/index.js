/**
 * PrintForge Printer Agent
 *
 * Watches Firestore "printJobs" collection for documents with status == "queued",
 * downloads the model file from Firebase Storage, and sends it to the
 * Flashforge M5 printer over the local network via its HTTP API.
 *
 * Run with:
 *   node index.js
 *
 * Requires .env (copy from .env.example and fill in values).
 */

import "dotenv/config";
import { createWriteStream, createReadStream } from "fs";
import { unlink, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath, pipeline as streamPipeline } from "stream";
import { promisify } from "util";
import { createRequire } from "module";

// node-fetch v3 is ESM-only
import fetch from "node-fetch";
import FormData from "form-data";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const pipeline = promisify(streamPipeline);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const PRINTER_IP = process.env.PRINTER_IP;
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccount.json";

if (!PRINTER_IP) {
  console.error("ERROR: PRINTER_IP is not set in .env");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  await import("fs").then((m) => m.readFileSync(join(__dirname, SERVICE_ACCOUNT_PATH), "utf8"))
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DOWNLOAD_DIR = join(__dirname, "downloads");
await mkdir(DOWNLOAD_DIR, { recursive: true });

// ── Flashforge M5 HTTP API ────────────────────────────────────────────────────
// The M5 exposes a simple HTTP server on port 8898 on the LAN.
// Docs: https://github.com/FlashForge/FlashForge-Printer-API (community)

const PRINTER_BASE = `http://${PRINTER_IP}:8898`;

async function printerRequest(path, method = "GET", body = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.body = body;
    if (body instanceof FormData) {
      Object.assign(opts.headers, body.getHeaders());
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${PRINTER_BASE}${path}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function uploadFileToPrinter(localPath, remoteFileName) {
  const form = new FormData();
  form.append("file", createReadStream(localPath), { filename: remoteFileName });
  return printerRequest("/file/upload", "POST", form);
}

async function startPrint(remoteFileName) {
  return printerRequest("/print/start", "POST", { filename: remoteFileName });
}

async function getPrinterStatus() {
  return printerRequest("/status");
}

// ── Download file from URL ────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  await pipeline(res.body, createWriteStream(destPath));
}

// ── Process a single print job ────────────────────────────────────────────────

async function processJob(jobDoc) {
  const jobId = jobDoc.id;
  const job = jobDoc.data();
  const localPath = join(DOWNLOAD_DIR, `${jobId}_${job.fileName}`);

  console.log(`\n[Job ${jobId}] Starting: ${job.productName} (${job.fileName})`);
  console.log(`  Order: ${job.orderId} | Material: ${job.requestedMaterial} | Color: ${job.requestedColor || "any"} | Infill: ${job.infillPercent}%`);

  try {
    // Mark as downloading
    await jobDoc.ref.update({ status: "downloading", startedAt: FieldValue.serverTimestamp() });

    console.log(`  Downloading from Storage…`);
    await downloadFile(job.fileUrl, localPath);
    console.log(`  Download complete.`);

    // Check printer status before uploading
    let printerStatus;
    try {
      printerStatus = await getPrinterStatus();
      console.log(`  Printer status:`, JSON.stringify(printerStatus));
    } catch (e) {
      console.warn(`  Could not get printer status: ${e.message}`);
    }

    // Upload to printer
    await jobDoc.ref.update({ status: "uploading" });
    console.log(`  Uploading to printer…`);
    const uploadResult = await uploadFileToPrinter(localPath, job.fileName);
    console.log(`  Upload result:`, JSON.stringify(uploadResult));

    // Start print
    await jobDoc.ref.update({ status: "printing" });
    console.log(`  Starting print…`);
    const printResult = await startPrint(job.fileName);
    console.log(`  Print started:`, JSON.stringify(printResult));

    // Mark done
    await jobDoc.ref.update({ status: "done", finishedAt: FieldValue.serverTimestamp() });

    // Also update the parent order's printStatus
    await db.collection("orders").doc(job.orderId).update({ printStatus: "printing" });

    console.log(`[Job ${jobId}] Done!`);
  } catch (err) {
    console.error(`[Job ${jobId}] FAILED:`, err.message);
    await jobDoc.ref.update({
      status: "failed",
      error: err.message,
      finishedAt: FieldValue.serverTimestamp(),
    });
    await db.collection("orders").doc(job.orderId).update({ printStatus: "failed" });
  } finally {
    // Clean up downloaded file
    await unlink(localPath).catch(() => {});
  }
}

// ── Watch for queued jobs ─────────────────────────────────────────────────────

let processing = false;

async function checkForJobs() {
  if (processing) return;

  const snap = await db
    .collection("printJobs")
    .where("status", "==", "queued")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();

  if (snap.empty) return;

  processing = true;
  try {
    await processJob(snap.docs[0]);
  } finally {
    processing = false;
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

console.log("PrintForge Printer Agent started.");
console.log(`  Printer: ${PRINTER_BASE}`);
console.log(`  Watching Firestore for print jobs…`);

// Use Firestore real-time listener for instant response
db.collection("printJobs")
  .where("status", "==", "queued")
  .orderBy("createdAt", "asc")
  .onSnapshot(
    (snap) => {
      if (!snap.empty && !processing) {
        checkForJobs().catch((e) => console.error("checkForJobs error:", e));
      }
    },
    (err) => console.error("Firestore listener error:", err)
  );

// Also poll every 30 seconds as a fallback
setInterval(() => {
  checkForJobs().catch((e) => console.error("poll error:", e));
}, 30_000);
