import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PATHS = ["/overview", "/project"];
const PUBLIC_PATHS = ["/auth", "/api/auth/signin", "/api/auth/signup"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log("Middleware checking path:", pathname);

  // Allow requests to NextAuth API routes to pass through
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Protect routes
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (token) {
      return NextResponse.next();
    }

    console.log("Unauthorized, redirecting to /auth");
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("callbackUrl", request.url); // Preserve the original destination
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
