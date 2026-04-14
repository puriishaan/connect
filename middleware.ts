import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user?.id;
  const { pathname } = req.nextUrl;

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
