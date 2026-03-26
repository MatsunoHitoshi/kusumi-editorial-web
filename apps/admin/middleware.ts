import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }: { token: { role?: string } | null; req: NextRequest }) => {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/api/workflows/dispatch")) {
        return token.role === "admin";
      }
      return true;
    }
  }
});

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*", "/api/workflows/dispatch"]
};
