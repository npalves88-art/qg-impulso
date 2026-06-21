import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "qg-impulso-dev-secret-change-me"
);
const COOKIE_NAME = "qg_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Server-to-server webhooks from marketplaces — no browser session cookie is sent.
const PUBLIC_PATH_SUFFIXES = ["/notifications"];

// Operador is restricted to this exact set of pages and the APIs each one needs — nothing else.
const OPERADOR_ALLOWED_PATHS = [
  "/anuncio-turbo",
  "/radar-equipe",
  "/ia-impulso",
  "/alterar-senha",
  "/api/auth/",
  "/api/ad-generator",
  "/api/ai-chat",
];
const OPERADOR_DEFAULT_PATH = "/anuncio-turbo";

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
  let payload: Record<string, unknown> | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, SECRET);
      payload = verified.payload as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (payload.role === "Operador" && !OPERADOR_ALLOWED_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso não permitido para este perfil." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(OPERADOR_DEFAULT_PATH, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
