import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

// Protection optimiste : redirige vers /connexion si aucun cookie de session.
// La validation réelle (session en base) est refaite côté page via requireUser().
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/profil/:path*", "/tableau-de-bord/:path*", "/annonces/:path*"],
};
