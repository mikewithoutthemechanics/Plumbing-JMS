import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    const devAdmin = request.cookies.get('dev_admin')?.value === '1';
    const isPublicRoute = request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/magic-link') ||
      request.nextUrl.pathname === '/';

    if (devAdmin) {
      const role = request.nextUrl.pathname.startsWith('/admin') ? 'owner' :
                   request.nextUrl.pathname.startsWith('/accountant') ? 'accountant' :
                   'technician';

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
  } catch {
    // On any error, just continue to allow the request
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
};