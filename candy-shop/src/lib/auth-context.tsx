"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCustomToken,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithSnapchat: () => void;
  sendPhoneOTP: (phone: string, useWhatsApp: boolean) => Promise<{ fallbackToSms?: boolean; devCode?: string }>;
  confirmPhoneOTP: (code: string) => Promise<void>;
  confirmWhatsAppOTP: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Handle Snapchat OAuth: Cloud Function redirects back with ?snapToken=...
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const snapToken = params.get("snapToken");
      if (snapToken) {
        signInWithCustomToken(auth, snapToken).finally(() => {
          params.delete("snapToken");
          const clean = params.toString() ? `?${params}` : window.location.pathname;
          window.history.replaceState({}, "", clean);
        });
      }
    }

    return unsub;
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signInWithApple() {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(auth, provider);
  }

  function signInWithSnapchat() {
    // Snapchat OAuth redirect — token exchange handled by Cloud Function
    const clientId = process.env.NEXT_PUBLIC_SNAPCHAT_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${FUNCTIONS_URL}/snapchatCallback`);
    const scope = encodeURIComponent(
      "https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar"
    );
    const state = btoa(window.location.href); // encode return URL
    window.location.href =
      `https://accounts.snapchat.com/accounts/oauth2/auth` +
      `?client_id=${clientId}&redirect_uri=${redirectUri}` +
      `&response_type=code&scope=${scope}&state=${state}`;
  }

  async function sendPhoneOTP(
    phone: string,
    useWhatsApp: boolean
  ): Promise<{ fallbackToSms?: boolean; devCode?: string }> {
    if (useWhatsApp) {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/sendWhatsAppOTP`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return { devCode: data.devCode };
      } catch {
        // Fall through to SMS
        return { fallbackToSms: true };
      }
    }

    // Firebase Phone Auth (SMS)
    await setupRecaptcha();
    const confirmation = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier!
    );
    window.confirmationResult = confirmation;
    return {};
  }

  async function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    await window.recaptchaVerifier.render();
  }

  async function confirmPhoneOTP(code: string) {
    if (!window.confirmationResult) throw new Error("No OTP session. Request a new code.");
    await window.confirmationResult.confirm(code);
  }

  async function confirmWhatsAppOTP(phone: string, code: string) {
    const res = await fetch(`${FUNCTIONS_URL}/verifyWhatsAppOTP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Invalid code");
    await signInWithCustomToken(auth, data.token);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithApple,
        signInWithSnapchat,
        sendPhoneOTP,
        confirmPhoneOTP,
        confirmWhatsAppOTP,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
