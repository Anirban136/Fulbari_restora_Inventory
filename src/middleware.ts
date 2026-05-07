import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string;
    const path = req.nextUrl.pathname;

    // Owner has access everywhere
    if (role === "OWNER") return NextResponse.next();

    // Route staff to their respective dashboards if they hit the main dashboard
    if (path === "/dashboard" || path === "/") {
      if (role === "REST_STAFF") return NextResponse.redirect(new URL("/restaurant", req.url));
      if (role === "CAFE_STAFF") return NextResponse.redirect(new URL("/tabs", req.url));
      if (role === "CHAI_STAFF") return NextResponse.redirect(new URL("/tabs", req.url));
    }

    // Protect /inventory
    if (path.startsWith("/inventory") && role !== "INV_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect /dashboard/transactions
    if (path.startsWith("/dashboard/transactions") && role !== "OWNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect /restaurant
    if (path.startsWith("/restaurant") && role !== "REST_STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect /cafe
    if (path.startsWith("/cafe") && role !== "CAFE_STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect /chai
    if (path.startsWith("/chai") && role !== "CHAI_STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};
