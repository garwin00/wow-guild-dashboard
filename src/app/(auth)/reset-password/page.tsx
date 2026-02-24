"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputStyle = {
    background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)",
    color: "#e8dfc8", borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem", outline: "none",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-sm mx-4">
        <div className="absolute -top-px -left-px w-6 h-6 border-t border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -top-px -right-px w-6 h-6 border-t border-r" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b border-r" style={{ borderColor: "#c8a96a" }} />

        <div className="rounded-lg p-8 flex flex-col gap-5"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(200,169,106,0.2)" }}>

          <div className="flex flex-col items-center gap-2 mb-1">
            <span className="text-4xl">🔒</span>
            <div className="wow-divider w-24" />
            <h1 className="text-xl wow-heading text-center" style={{ color: "#f0c040" }}>New Password</h1>
          </div>

          {!token ? (
            <div className="text-center">
              <p className="text-sm" style={{ color: "#c84040" }}>Invalid reset link.</p>
              <Link href="/forgot-password" className="text-sm mt-3 block" style={{ color: "#c8a96a" }}>Request a new one →</Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-2">
              <p className="text-sm" style={{ color: "#e8dfc8" }}>✅ Password updated! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle} placeholder="Min 8 characters" required />
              </div>
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  style={inputStyle} placeholder="Repeat password" required />
              </div>
              {error && <p className="text-sm" style={{ color: "#c84040" }}>{error}</p>}
              <button type="submit" disabled={loading} className="wow-btn w-full">
                {loading ? "Saving…" : "Set New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
