import { NextResponse, type NextRequest } from "next/server";

// First gate for the admin panel: visitors without a session never reach admin pages.
// Each admin page and action still checks that the session belongs to the main admin.
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/superadmin/login" || req.cookies.has("sf_session")) return NextResponse.next();
  return NextResponse.redirect(new URL("/superadmin/login", req.url));
}

export const config = { matcher: ["/superadmin/:path*"] };
