import { NextResponse, type NextRequest } from "next/server";

import { verifySessionToken } from "@/lib/admin/session";

/**
 * Early gate for admin pages: unauthenticated visitors get a real 307 to the
 * login page instead of a streamed redirect. This is a convenience layer only;
 * every admin page and server action still calls requireAdmin() itself.
 */
export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  const token = request.cookies.get("shanvis_admin")?.value;
  if (secret && verifySessionToken(token, secret)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
