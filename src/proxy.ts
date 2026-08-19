import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const user = req.auth?.user;

  // Not logged in
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin area → ADMIN only
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};