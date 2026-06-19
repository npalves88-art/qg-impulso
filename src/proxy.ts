import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "qg-impulso-dev-secret-change-me"
);
const COOKIE_NAME = "qg_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Server-to-server webhooks from marketplaces — no browser session cookie is sent.
const PUBLIC_PATH_SUFFIXES = ["/notifications"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    (pathname.startsWith("/api/integrations/") &&
      PUBLIC_PATH_SUFFIXES.some((suffix) => pathname.endsWith(suffix))) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
