import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@zugzug.pro";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.zugzug.pro";

export async function sendWelcomeEmail(email: string, name: string) {
  const dashboardUrl = APP_URL;

  if (!resend) {
    console.log(`[DEV] Welcome email for ${email}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to ZugZug Guild Dashboard",
    html: `
      <div style="background:#09090e;color:#e8dfc8;font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid rgba(200,169,106,0.2);border-radius:8px;">
        <h1 style="color:#f0c040;font-size:1.5rem;margin-bottom:8px;">⚔️ ZugZug Guild Dashboard</h1>
        <div style="height:1px;background:linear-gradient(to right,transparent,#c8a96a,transparent);margin-bottom:24px;"></div>
        <p style="margin-bottom:8px;">Welcome, <strong style="color:#c8a96a;">${name}</strong>!</p>
        <p style="margin-bottom:24px;color:#8a8070;">Your account has been created. Connect your Battle.net account to import your guild and characters, then start tracking raids, rosters, and logs.</p>
        <a href="${dashboardUrl}/guilds/new"
          style="display:inline-block;background:linear-gradient(135deg,#c8a96a,#a07840);color:#09090e;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;letter-spacing:0.05em;">
          Set Up Your Guild →
        </a>
        <p style="margin-top:32px;font-size:0.75rem;color:#5a5040;">
          ZugZug · <a href="${dashboardUrl}" style="color:#5a5040;">${dashboardUrl.replace("https://", "")}</a>
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (!resend) {
    // Dev fallback — log to console when RESEND_API_KEY not set
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your ZugZug password",
    html: `
      <div style="background:#09090e;color:#e8dfc8;font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid rgba(200,169,106,0.2);border-radius:8px;">
        <h1 style="color:#f0c040;font-size:1.5rem;margin-bottom:8px;">⚔️ ZugZug Guild Dashboard</h1>
        <div style="height:1px;background:linear-gradient(to right,transparent,#c8a96a,transparent);margin-bottom:24px;"></div>
        <p style="margin-bottom:16px;">A password reset was requested for your account.</p>
        <p style="margin-bottom:24px;">This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#c8a96a,#a07840);color:#09090e;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;letter-spacing:0.05em;">
          Reset Password
        </a>
        <p style="margin-top:24px;font-size:0.75rem;color:#5a5040;">
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
