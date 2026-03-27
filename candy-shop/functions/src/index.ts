/**
 * Firebase Cloud Functions for CandyShop
 *
 * Functions:
 *  - sendWhatsAppOTP   — sends a 6-digit OTP via WhatsApp (Meta Cloud API)
 *  - verifyWhatsAppOTP — verifies the OTP and returns a Firebase custom token
 *  - snapchatCallback  — handles Snapchat OAuth redirect and issues a custom token
 *
 * Environment variables (set with `firebase functions:secrets:set VAR`):
 *  - WHATSAPP_TOKEN           Meta Cloud API Bearer token
 *  - WHATSAPP_PHONE_NUMBER_ID Meta phone-number ID for your business number
 *  - SNAPCHAT_CLIENT_ID       Snapchat Login Kit client ID
 *  - SNAPCHAT_CLIENT_SECRET   Snapchat Login Kit client secret
 *  - ALLOWED_ORIGIN           Frontend URL (e.g. https://user.github.io/repo)
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// ── CORS helper ─────────────────────────────────────────────────────────────

function cors(req: functions.Request, res: functions.Response): boolean {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

// ── OTP helpers ──────────────────────────────────────────────────────────────

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ── sendWhatsAppOTP ──────────────────────────────────────────────────────────

export const sendWhatsAppOTP = functions.onRequest(
  { secrets: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"], cors: false },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const { phone } = req.body as { phone?: string };
    if (!phone) { res.status(400).json({ error: "phone required" }); return; }

    const code = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min

    await db.collection("otpCodes").add({ phone, code, expires, used: false, channel: "whatsapp" });

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      // Dev mode — return code directly
      res.json({ success: true, devCode: code, message: "Dev mode: no WhatsApp credentials set" });
      return;
    }

    // Send via Meta WhatsApp Cloud API using the pre-approved authentication template
    const waRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "template",
          template: {
            name: "authentication_otp", // Your approved template name
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: code }],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: code }],
              },
            ],
          },
        }),
      }
    );

    if (!waRes.ok) {
      const err = await waRes.json().catch(() => ({}));
      console.error("WhatsApp API error:", err);
      res.status(502).json({ error: "WhatsApp delivery failed", fallbackToSms: true });
      return;
    }

    res.json({ success: true });
  }
);

// ── verifyWhatsAppOTP ────────────────────────────────────────────────────────

export const verifyWhatsAppOTP = functions.onRequest(
  { cors: false },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const { phone, code } = req.body as { phone?: string; code?: string };
    if (!phone || !code) { res.status(400).json({ error: "phone and code required" }); return; }

    const snap = await db
      .collection("otpCodes")
      .where("phone", "==", phone)
      .where("code", "==", code)
      .where("used", "==", false)
      .orderBy("expires", "desc")
      .limit(1)
      .get();

    if (snap.empty) { res.status(401).json({ error: "Invalid or expired code" }); return; }

    const otpDoc = snap.docs[0];
    if (otpDoc.data().expires < Date.now()) {
      res.status(401).json({ error: "Code expired" });
      return;
    }

    await otpDoc.ref.update({ used: true });

    // Create or get the Firebase user by phone
    let uid: string;
    try {
      const user = await admin.auth().getUserByPhoneNumber(phone);
      uid = user.uid;
    } catch {
      const newUser = await admin.auth().createUser({ phoneNumber: phone, displayName: `User ${phone.slice(-4)}` });
      uid = newUser.uid;
    }

    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ token: customToken });
  }
);

// ── snapchatCallback ─────────────────────────────────────────────────────────

export const snapchatCallback = functions.onRequest(
  { secrets: ["SNAPCHAT_CLIENT_ID", "SNAPCHAT_CLIENT_SECRET"], cors: false },
  async (req, res) => {
    // Snapchat redirects here with ?code=...&state=...
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code) {
      res.status(400).send("Missing code parameter");
      return;
    }

    const clientId = process.env.SNAPCHAT_CLIENT_ID;
    const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
    const redirectUri = `https://${req.hostname}/snapchatCallback`;

    if (!clientId || !clientSecret) {
      res.status(500).send("Snapchat credentials not configured");
      return;
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://accounts.snapchat.com/accounts/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      res.status(502).send("Failed to exchange Snapchat code");
      return;
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // Fetch Snapchat user info
    const meRes = await fetch("https://kit.snapchat.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meJson = (await meRes.json()) as { data: { me: { externalId: string; displayName: string } } };
    const { externalId, displayName } = meJson.data.me;

    // Get or create Firebase user
    let uid: string;
    try {
      const user = await admin.auth().getUserByProviderUid("snapchat.com", externalId);
      uid = user.uid;
    } catch {
      const newUser = await admin.auth().createUser({ displayName });
      await admin.auth().updateUser(newUser.uid, {});
      uid = newUser.uid;
    }

    const customToken = await admin.auth().createCustomToken(uid);

    // Decode the return URL from state param and redirect with token
    let returnUrl = "/";
    try {
      returnUrl = atob(state || "");
      // Strip any existing token params
      const u = new URL(returnUrl);
      u.searchParams.set("snapToken", customToken);
      returnUrl = u.toString();
    } catch {
      returnUrl = `/?snapToken=${customToken}`;
    }

    res.redirect(returnUrl);
  }
);
