import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Only imports authConfig — no Prisma, no bcrypt. Stays well under the 1MB edge limit.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
