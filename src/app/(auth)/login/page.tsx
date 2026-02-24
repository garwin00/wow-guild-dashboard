"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? `OAuth error: ${urlError}` : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // NextAuth v5 signIn throws NEXT_REDIRECT on success, throws CredentialsSignin on failure
    try {
      await signIn("credentials", { email, password, redirectTo: callbackUrl });
    } catch (err) {
      // NEXT_REDIRECT is thrown on success — let it propagate (Next.js handles it)
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
      setError("Invalid email or password");
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)",
    color: "#e8dfc8", borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem", outline: "none",
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

        <div className="rounded-lg p-8 flex flex-col gap-5"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(200,169,106,0.2)" }}>

          <div className="flex flex-col items-center gap-2 mb-1">
            <span className="text-4xl">⚔️</span>
            <div className="wow-divider w-24" />
            <h1 className="text-xl wow-heading text-center" style={{ color: "#f0c040" }}>Guild Dashboard</h1>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: "#5a5040" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} placeholder="Your password" required />
            </div>
            {error && <p className="text-sm" style={{ color: "#c84040" }}>{error}</p>}
            <button type="submit" disabled={loading} className="wow-btn w-full">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: "#5a5040" }}>
            No account?{" "}
            <Link href="/register" style={{ color: "#c8a96a" }} className="hover:text-[#f0c040] transition-colors">
              Create one
            </Link>
            {" · "}
            <Link href="/forgot-password" style={{ color: "#c8a96a" }} className="hover:text-[#f0c040] transition-colors">
              Forgot password?
            </Link>
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(200,169,106,0.15)" }} />
            <span className="text-xs" style={{ color: "#5a5040" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(200,169,106,0.15)" }} />
          </div>

          {/* Battle.net */}
          <button onClick={() => signIn("battlenet", { callbackUrl })} className="wow-btn-ghost w-full flex items-center justify-center gap-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-9v-1.5l3-3-3-3V7.5h9V9h-6l2.5 2.5L10 14h6.5v1.5z"/>
            </svg>
            Continue with Battle.net
          </button>

          <p className="text-xs text-center" style={{ color: "#5a5040" }}>Azeroth awaits, champion.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
