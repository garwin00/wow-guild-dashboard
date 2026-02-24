"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)",
    color: "var(--wow-text)", borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem", outline: "none",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-sm mx-4">
        <div className="absolute -top-px -left-px w-6 h-6 border-t border-l" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -top-px -right-px w-6 h-6 border-t border-r" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b border-l" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b border-r" style={{ borderColor: "var(--wow-gold)" }} />

        <div className="rounded-lg p-8 flex flex-col gap-5"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>

          <div className="flex flex-col items-center gap-2 mb-1">
            <span className="text-4xl">🔑</span>
            <div className="wow-divider w-24" />
            <h1 className="text-xl wow-heading text-center" style={{ color: "var(--wow-gold-bright)" }}>Reset Password</h1>
          </div>

          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-sm" style={{ color: "var(--wow-text)" }}>
                If an account with that email exists, a reset link has been sent.
              </p>
              <p className="text-xs" style={{ color: "var(--wow-text-muted)" }}>Check your inbox (and spam folder).</p>
              <Link href="/login" className="block text-sm" style={{ color: "var(--wow-gold)" }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "var(--wow-text-faint)" }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    style={inputStyle} placeholder="you@example.com" required />
                </div>
                <button type="submit" disabled={loading} className="wow-btn w-full">
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <Link href="/login" className="text-sm text-center" style={{ color: "var(--wow-text-faint)" }}>
                ← Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
