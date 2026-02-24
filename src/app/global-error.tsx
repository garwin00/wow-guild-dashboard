"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "var(--wow-bg)", color: "var(--wow-text)", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "32rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ color: "var(--wow-gold-bright)", marginBottom: "0.5rem", fontSize: "1.25rem" }}>Something went wrong</h2>
          {error?.message && (
            <p style={{ color: "var(--wow-text-muted)", fontSize: "0.875rem", marginBottom: "1rem", wordBreak: "break-all" }}>
              {error.message}
            </p>
          )}
          {error?.digest && (
            <p style={{ color: "var(--wow-text-faint)", fontSize: "0.75rem", marginBottom: "1rem" }}>Digest: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{ background: "linear-gradient(135deg,#c8a96a,#f0c040,#c8a96a)", color: "#0d0d0d", border: "none", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
