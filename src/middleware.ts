import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  try {
    // Request logging (dev only)
    if (process.env.NODE_ENV !== "production") {
      logger.debug(`${request.method} ${request.nextUrl.pathname}`);
    }

    // CSRF protection - check origin for non-GET/HEAD/OPTIONS
    // Fix: allow both custom domain and vercel.app (client on app.punctualplumbers.co.za
    // was blocked when NEXT_PUBLIC_APP_URL=plumbing-jms.vercel.app)
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const origin =
        request.headers.get("origin") || request.headers.get("referer") || "";
      if (origin) {
        let originHost = "";
        try {
          originHost = new URL(origin).origin;
        } catch {
          originHost = "";
        }
        if (originHost) {
          const allowedOrigins = new Set<string>(
            [
              request.nextUrl.origin,
              process.env.NEXT_PUBLIC_APP_URL
                ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
                : "",
              "https://app.punctualplumbers.co.za",
              "https://plumbing-jms.vercel.app",
              "https://plumbing-jms-michael-s-projects-1c4584cf.vercel.app",
            ].filter(Boolean) as string[],
          );
          if (!allowedOrigins.has(originHost)) {
            return NextResponse.json(
              { error: "Invalid origin" },
              { status: 403 },
            );
          }
        }
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const demoModeEnv = process.env.NEXT_PUBLIC_DEMO_MODE;
    const isDevEnv = process.env.NODE_ENV !== 'production';
    const devMode = isDevEnv && (demoModeEnv === 'true' || demoModeEnv === '1' || demoModeEnv === 'TRUE');

    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

    const isPublicRoute =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/magic-link") ||
      request.nextUrl.pathname.startsWith("/auth/callback") ||
      request.nextUrl.pathname === "/";

    if (!user && !devMode && !isPublicRoute && !isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      // Preserve refreshed cookies on redirect (critical for Safari/Chrome)
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, c));
      return redirectResponse;
    }

    if (user && isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/overview";
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, c));
      return redirectResponse;
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

      // Try to get role from JWT claims first (cached in user_metadata/app_metadata)
      let role = user.user_metadata?.role || user.app_metadata?.role;
      
      if (!role) {
        // Fallback to DB query if not in JWT
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role || "";
      }

      if (
        role === "owner" &&
        request.nextUrl.pathname.startsWith("/technician")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/jobs";
        const r = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value, c));
        return r;
      }
      if (
        role === "technician" &&
        request.nextUrl.pathname.startsWith("/admin")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/technician/jobs";
        const r = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value, c));
        return r;
      }
      if (
        role === "accountant" &&
        !request.nextUrl.pathname.startsWith("/accountant")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/accountant/jobs";
        const r = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value, c));
        return r;
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("[Middleware] Error:", { error: err });
    }
    const isApi = request.nextUrl.pathname.startsWith("/api/");
    return isApi
      ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};