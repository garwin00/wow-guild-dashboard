"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "bnet" | "guild";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("bnet");
  const [hasBnet, setHasBnet] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If they arrive back from BNet OAuth with linked=1, skip to guild step
    const params = new URLSearchParams(window.location.search);
    if (params.get("bnet_linked") === "1") {
      window.history.replaceState({}, "", "/onboarding");
      setHasBnet(true);
      setStep("guild");
      setChecking(false);
      return;
    }

    fetch("/api/auth/bnet-status")
      .then(r => r.json())
      .then(status => {
        if (!status.authenticated) { router.replace("/login"); return; }
        if (status.linked) { setHasBnet(true); setStep("guild"); }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
        <div className="text-center" style={{ color: "var(--wow-text-muted)" }}>
          <div className="animate-spin text-2xl mb-2">⚙️</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-md">
        {/* Corner accents */}
        {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r", "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
          <div key={i} className={`absolute w-6 h-6 ${cls}`} style={{ borderColor: "var(--wow-gold)" }} />
        ))}

        <div className="rounded-lg p-8 space-y-6"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>

          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-4xl">⚔️</span>
            <div className="wow-divider w-24 mx-auto" />
            <h1 className="text-xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>Welcome to ZugZug</h1>
            <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>Your guild admin dashboard</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {(["bnet", "guild"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: step === s ? "rgba(var(--wow-primary-rgb),0.3)" : (hasBnet && s === "bnet") ? "rgba(64,200,100,0.2)" : "rgba(var(--wow-primary-rgb),0.08)",
                    border: step === s ? "1px solid rgba(var(--wow-primary-rgb),0.6)" : "1px solid rgba(var(--wow-primary-rgb),0.2)",
                    color: step === s ? "var(--wow-gold-bright)" : (hasBnet && s === "bnet") ? "#40c864" : "var(--wow-text-faint)",
                  }}>
                  {hasBnet && s === "bnet" ? "✓" : i + 1}
                </div>
                <span className="text-xs" style={{ color: step === s ? "var(--wow-text)" : "var(--wow-text-faint)" }}>
                  {s === "bnet" ? "Battle.net" : "Your Guild"}
                </span>
                {i < 1 && <div className="flex-1 h-px mx-1" style={{ background: "rgba(var(--wow-primary-rgb),0.15)" }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Link Battle.net */}
          {step === "bnet" && (
            <div className="space-y-4">
              <div className="rounded-lg p-5 space-y-3"
                style={{ background: "rgba(var(--wow-primary-rgb),0.05)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
                <p className="font-semibold text-sm" style={{ color: "var(--wow-text)" }}>🎮 Link your Battle.net account</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--wow-text-muted)" }}>
                  Linking Battle.net lets ZugZug automatically import your guild roster, character portraits, item levels, and specs. It also connects your characters to your account.
                </p>
                <button onClick={() => { window.location.href = "/api/auth/link-battlenet?returnTo=/onboarding?bnet_linked=1"; }}
                  className="wow-btn w-full">
                  Connect Battle.net
                </button>
              </div>
              <button onClick={() => setStep("guild")}
                className="w-full text-sm py-2 transition-colors"
                style={{ color: "var(--wow-text-faint)", fontFamily: "inherit" }}
                onMouseOver={e => e.currentTarget.style.color = "var(--wow-text)"}
                onMouseOut={e => e.currentTarget.style.color = "var(--wow-text-faint)"}>
                Skip for now — set up guild manually →
              </button>
            </div>
          )}

          {/* Step 2: Guild */}
          {step === "guild" && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
                {hasBnet ? "Battle.net linked! Now set up your guild." : "Set up your guild to get started."}
              </p>
              <Link href="/guilds/new?tab=create"
                className="flex items-center justify-between rounded-lg px-4 py-4 transition-all"
                style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(var(--wow-primary-rgb),0.06)"; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--wow-surface)"; }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--wow-text)" }}>🏰 Create a new guild</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>Set up a dashboard for your guild</p>
                </div>
                <span style={{ color: "var(--wow-gold)" }}>→</span>
              </Link>
              <Link href="/guilds/new?tab=join"
                className="flex items-center justify-between rounded-lg px-4 py-4 transition-all"
                style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(var(--wow-primary-rgb),0.06)"; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--wow-surface)"; }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--wow-text)" }}>👥 Join an existing guild</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>Find a guild already using ZugZug</p>
                </div>
                <span style={{ color: "var(--wow-gold)" }}>→</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
