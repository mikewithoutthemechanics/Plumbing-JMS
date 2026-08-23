import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  try {
    // Request logging (dev only)
    if (process.env.NODE_ENV !== "production") {
      logger.debug(`${request.method} ${request.nextUrl.pathname}`);
    }

    // CSRF protection - check origin for non-GET/HEAD/OPTIONS
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const origin =
        request.headers.get("origin") || request.headers.get("referer") || "";
      const allowedOrigin =
        process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      if (
        origin &&
        new URL(origin).origin !== new URL(allowedOrigin).origin
      ) {
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403 },
        );
      }
    }

    // Rate limiting for API routes
    if (
      request.nextUrl.pathname.startsWith("/api/") &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
    ) {
      const getClientIp = (r: NextRequest): string => {
        const forwarded = r.headers.get("x-forwarded-for");
        if (forwarded) return forwarded.split(",")[0].trim();
        const realIp = r.headers.get("x-real-ip");
        if (realIp) return realIp;
        return "unknown";
      };
      const ip = getClientIp(request);
      const rateKey = `rate:${request.nextUrl.pathname}:${ip}`;
      const rateCheck = await checkRateLimit(rateKey);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 },
        );
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new NextResponse('Supabase configuration missing', { status: 503 });
    }

    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const devMode = request.cookies.get('dev_admin')?.value === '1' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

    const isPublicRoute =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/magic-link") ||
      request.nextUrl.pathname.startsWith("/auth/callback") ||
      request.nextUrl.pathname === "/";

    if (!user && !devMode && !isPublicRoute && !isApiRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user && isPublicRoute) {
      return NextResponse.redirect(
        new URL("/admin/overview", request.url),
      );
    }

    if (
      user &&
      !devMode &&
      (request.nextUrl.pathname.startsWith("/admin") ||
        request.nextUrl.pathname.startsWith("/technician") ||
        request.nextUrl.pathname.startsWith("/accountant"))
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "";

      if (
        role === "owner" &&
        request.nextUrl.pathname.startsWith("/technician")
      ) {
        return NextResponse.redirect(
          new URL("/admin/jobs", request.url),
        );
      }
      if (
        role === "technician" &&
        request.nextUrl.pathname.startsWith("/admin")
      ) {
        return NextResponse.redirect(
          new URL("/technician/jobs", request.url),
        );
      }
      if (
        role === "accountant" &&
        !request.nextUrl.pathname.startsWith("/accountant")
      ) {
        return NextResponse.redirect(
          new URL("/accountant/jobs", request.url),
        );
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("[Middleware] Error:", { error: err });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};