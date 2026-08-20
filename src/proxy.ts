import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const user = req.auth?.user;
  const pathname = req.nextUrl.pathname;
  const lowerPath = pathname.toLowerCase();

  // Not logged in
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ADMIN area
  if (lowerPath.startsWith("/admin")) {
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // EMPLOYEE area
  if (lowerPath.startsWith("/employee")) {
    if (user.role !== "EMPLOYEE") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // TL area
  if (lowerPath.startsWith("/tl")) {
    if (user.role !== "TL") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // CEO area
  if (lowerPath.startsWith("/ceo")) {
    if (user.role !== "CEO") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Redirect any uppercase paths to canonical lowercase
  if (pathname !== lowerPath) {
    return NextResponse.redirect(new URL(lowerPath, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/employee/:path*",
    "/tl/:path*",
    "/ceo/:path*",
    "/TL/:path*",
    "/Admin/:path*",
    "/Employee/:path*",
    "/CEO/:path*",
  ],
};