import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PATHS = ["/overview", "/project"];
const PUBLIC_PATHS = ["/auth", "/api/auth/signin", "/api/auth/signup"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log("Middleware checking path:", pathname);

  // Create the response object that we'll modify and return
  let response;

  // Allow requests to NextAuth API routes to pass through
  if (pathname.startsWith("/api/auth/")) {
    response = NextResponse.next();
  }
  // Protect routes
  else if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (token) {
      response = NextResponse.next();
    } else {
      console.log("Unauthorized, redirecting to /auth");
      const redirectUrl = new URL("/auth", request.url);
      redirectUrl.searchParams.set("callbackUrl", request.url); // Preserve the original destination
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    response = NextResponse.next();
  }

  // Add security headers to every response
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), display-capture=()');

  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy - includes YouTube support
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; " +
    "connect-src 'self' https://www.youtube.com;"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};