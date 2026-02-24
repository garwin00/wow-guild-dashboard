"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      // Auto sign-in then go to onboarding
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { setError("Registration succeeded but sign-in failed. Please log in."); return; }
      router.push("/guilds/new");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)",
    color: "#e8dfc8", borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem",
    outline: "none",
  };

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

        <div className="rounded-lg p-8" style={{ background: "#0d0f18", border: "1px solid rgba(200,169,106,0.2)" }}>
          <p className="text-center text-xs uppercase tracking-widest mb-1" style={{ color: "#5a5040" }}>Guild Dashboard</p>
          <h1 className="text-xl font-bold text-center mb-6" style={{ color: "#f0c040" }}>Create Account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} placeholder="Min. 8 characters" required />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                style={inputStyle} placeholder="Repeat password" required />
            </div>

            {error && <p className="text-sm" style={{ color: "#c84040" }}>{error}</p>}

            <button type="submit" disabled={loading} className="wow-btn w-full mt-2">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="wow-divider my-5" />

          <p className="text-center text-xs" style={{ color: "#5a5040" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#c8a96a" }} className="hover:text-[#f0c040] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
