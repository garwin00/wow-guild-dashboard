import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuth = !!req.auth;
  const isAuthPage = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();
  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
