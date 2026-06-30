import { NextRequest, NextResponse } from 'next/server';
import { asyncLocalStorage, getRequestContext } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function middleware(request: NextRequest) {
  const store = new Map<string, { request: NextRequest }>();
  store.set('request', { request });
  return asyncLocalStorage.run(store, async () => {
    try {
      // Request logging (dev only)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`${request.method} ${request.nextUrl.pathname}`);
      }

      // CSRF protection: check origin for non-GET/HEAD/OPTIONS
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const origin = request.headers.get('origin') || request.headers.get('referer') || '';
        const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        if (!origin.startsWith(allowedOrigin)) {
          return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
        }
      }

      // Rate limiting for API routes
      if (request.nextUrl.pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const ctx = getRequestContext();
        const req = ctx?.request || request;
        const getClientIp = (r: NextRequest): string => {
          const forwarded = r.headers.get('x-forwarded-for');
          if (forwarded) return forwarded.split(',')[0].trim();
          const realIp = r.headers.get('x-real-ip');
          if (realIp) return realIp;
          return 'unknown';
        };
        const ip = getClientIp(req);
        const rateKey = `rate:${request.nextUrl.pathname}:${ip}`;
        const rateCheck = checkRateLimit(rateKey);
        if (!rateCheck.allowed) {
          return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }
      }

      // Dev auth gating
      const enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';
      const devAdmin = enableDevAuth && request.cookies.get('dev_admin')?.value === '1';

      if (devAdmin) {
        const role = request.nextUrl.pathname.startsWith('/admin') ? 'owner' :
                     request.nextUrl.pathname.startsWith('/accountant') ? 'accountant' :
                     'technician';

        const isPublicRoute = request.nextUrl.pathname.startsWith('/login') ||
          request.nextUrl.pathname.startsWith('/magic-link') ||
          request.nextUrl.pathname === '/';

        if (isPublicRoute && role === 'owner') {
          return NextResponse.redirect(new URL('/admin/overview', request.url));
        }
        if (role === 'owner' && request.nextUrl.pathname.startsWith('/technician')) {
          return NextResponse.redirect(new URL('/admin/overview', request.url));
        }
        if (role === 'technician' && request.nextUrl.pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/technician/jobs', request.url));
        }
        if (role === 'accountant' && !request.nextUrl.pathname.startsWith('/accountant')) {
          return NextResponse.redirect(new URL('/accountant/jobs', request.url));
        }
        return NextResponse.next();
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next();
      }

      const { createServerClient } = await import('@supabase/ssr');
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();

      const isPublicRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/magic-link') ||
        request.nextUrl.pathname === '/';

      if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      if (user && isPublicRoute) {
        return NextResponse.redirect(new URL('/admin/overview', request.url));
      }

      if (user && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/technician') || request.nextUrl.pathname.startsWith('/accountant'))) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || '';

        if (role === 'owner' && request.nextUrl.pathname.startsWith('/technician')) {
          return NextResponse.redirect(new URL('/admin/jobs', request.url));
        }
        if (role === 'technician' && request.nextUrl.pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/technician/jobs', request.url));
        }
        if (role === 'accountant' && !request.nextUrl.pathname.startsWith('/accountant')) {
          return NextResponse.redirect(new URL('/accountant/jobs', request.url));
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Middleware] Error:', err);
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
};
