import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}
    >
      {/* Decorative top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-sm mx-4">
        {/* Corner decorations */}
        <div className="absolute -top-px -left-px w-6 h-6 border-t border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -top-px -right-px w-6 h-6 border-t border-r" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b border-r" style={{ borderColor: "#c8a96a" }} />

        <div
          className="rounded-lg p-10 flex flex-col items-center gap-6"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(200,169,106,0.2)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl">⚔️</span>
            <div className="wow-divider w-24" />
            <h1 className="text-xl wow-heading text-center" style={{ color: "#f0c040" }}>
              Guild Dashboard
            </h1>
            <p className="text-sm text-center" style={{ color: "#8a8070" }}>
              Sign in with Battle.net to manage your guild.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("battlenet", { redirectTo: "/" });
            }}
            className="w-full"
          >
            <button type="submit" className="wow-btn w-full flex items-center justify-center gap-3">
              {/* Battle.net icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-9v-1.5l3-3-3-3V7.5h9V9h-6l2.5 2.5L10 14h6.5v1.5z"/>
              </svg>
              Sign in with Battle.net
            </button>
          </form>

          <div className="wow-divider w-full" />
          <p className="text-xs text-center" style={{ color: "#5a5040" }}>
            Azeroth awaits, champion.
          </p>
        </div>
      </div>
    </div>
  );
}
