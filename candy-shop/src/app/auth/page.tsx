"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"social" | "phone">("social");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function sendOtp() {
    setError("");
    if (!phone.trim()) return setError("Enter your phone number");
    setLoading(true);
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      if (data.devCode) setDevCode(data.devCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    if (!otp.trim()) return setError("Enter the OTP code");
    setLoading(true);
    try {
      const result = await signIn("phone", {
        phone,
        code: otp,
        redirect: false,
      });
      if (result?.error) throw new Error("Invalid OTP code");
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-pink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🍬</p>
          <h1 className="text-2xl font-bold text-pink-700">Sign in to CandyShop</h1>
          <p className="text-gray-500 text-sm mt-1">Get sweet deals faster</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
          {/* Tabs */}
          <div className="flex rounded-xl bg-pink-50 p-1 mb-5">
            <button
              onClick={() => setTab("social")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "social" ? "bg-white shadow-sm text-pink-700" : "text-gray-500"
              }`}
            >
              Social Login
            </button>
            <button
              onClick={() => setTab("phone")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "phone" ? "bg-white shadow-sm text-pink-700" : "text-gray-500"
              }`}
            >
              Phone Number
            </button>
          </div>

          {tab === "social" && (
            <div className="space-y-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => signIn("apple", { callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Continue with Apple
              </button>

              <button
                onClick={() => signIn("snapchat", { callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-4 py-3 border border-yellow-300 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-yellow-400">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.317 4.785l-.004.061c-.004.073.017.146.063.203.865 1.106 2.282 1.48 3.24 1.714.183.045.372.091.555.143.891.258 1.009.597.968.789-.053.274-.373.38-.772.38-.19 0-.381-.029-.57-.059-.455-.07-.849-.128-1.194-.053-.29.063-.443.201-.64.393.002.09.011.181.021.273.071.634.17 1.5-.343 2.364-.734 1.237-2.416 2.07-4.85 2.456-.099.016-.183.09-.19.19-.007.1.054.19.15.22.376.118.993.377 1.485.784.484.4.737.861.737 1.358-.001.515-.376.978-.904 1.167-.285.1-.62.178-.994.235-.358.055-.657.1-.919.195-.138.052-.265.114-.372.226a.476.476 0 00-.12.293c-.01.225.063.386.101.46l.02.045c.158.338.224.54.175.708-.067.228-.28.38-.555.412-.193.023-.388.033-.585.033-.356 0-.71-.033-1.063-.098-.35-.065-.641-.162-.93-.255-.282-.09-.574-.184-.901-.232-.264-.039-.498-.007-.723.025-.35.05-.7.102-.91.02-.237-.09-.338-.317-.33-.566.008-.246.134-.554.219-.783.025-.068.048-.13.065-.182l.019-.053c.042-.122.069-.202.073-.262.013-.17-.054-.33-.188-.448-.146-.13-.346-.208-.603-.235-.31-.033-.618-.058-.921-.096-2.33-.286-3.95-1.113-4.685-2.373-.52-.865-.428-1.73-.357-2.365.012-.098.022-.19.027-.278-.2-.193-.357-.33-.649-.393-.343-.075-.737-.016-1.192.053-.188.03-.377.059-.568.059-.399 0-.72-.106-.772-.38-.041-.192.077-.531.968-.789.183-.052.372-.098.555-.143.958-.234 2.375-.608 3.24-1.714a.31.31 0 00.063-.203l-.004-.061c-.086-1.566-.212-3.592.317-4.785C7.853 1.07 11.215.793 12.207.793z"/>
                </svg>
                Continue with Snapchat
              </button>
            </div>
          )}

          {tab === "phone" && (
            <div className="space-y-3">
              {!otpSent ? (
                <>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+966 5xx xxx xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    Send OTP
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Code sent to <strong>{phone}</strong>
                  </p>
                  {devCode && (
                    <p className="text-xs text-center bg-yellow-50 border border-yellow-200 rounded-lg py-2 text-yellow-700">
                      Dev code: <strong>{devCode}</strong>
                    </p>
                  )}
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <button
                    onClick={verifyOtp}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Verify & Sign In
                  </button>
                  <button
                    onClick={() => { setOtpSent(false); setOtp(""); setDevCode(""); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Use different number
                  </button>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-500 text-xs text-center">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          By signing in, you agree to our terms. You can also checkout as a guest.
        </p>
      </div>
    </main>
  );
}
