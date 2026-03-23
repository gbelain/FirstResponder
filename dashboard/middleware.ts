import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("fr_auth")?.value === "1";

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (the login page itself)
     * - /api/auth (the auth endpoint)
     * - _next/static, _next/image, favicon.ico (Next.js internals)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
