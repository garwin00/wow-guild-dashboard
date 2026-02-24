import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10); // 10 rounds — faster on serverless
    const name = email.split("@")[0];
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        bnetId: `email:${email}`,
        battletag: name,
        name,
      },
    });

    // Await the email but swallow errors — never block registration
    try { await sendWelcomeEmail(email, name); } catch (err) { console.error("[register] welcome email failed:", err); }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
