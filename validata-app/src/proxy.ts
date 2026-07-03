import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
const urlToUse = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

// ICH E6(R3) SEC-01 / AUTH-01: Demo Mode must be disabled in production.
// Set NEXT_PUBLIC_DEMO_ENABLED=false in Vercel production environment variables.
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED !== 'false';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public assets, static files, and the login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Refresh the Supabase session cookie on every request (the standard
  // @supabase/ssr middleware pattern) - this must run before any other
  // cookie access below, and `response` must be the object actually
  // returned, since that's what carries the refreshed cookies to the client.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(urlToUse, keyToUse, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // ICH E6(R3) SEC-01: demo cookie is only honoured when demo mode is enabled.
  // In production (NEXT_PUBLIC_DEMO_ENABLED=false) it is silently ignored so a
  // tampered cookie cannot bypass Supabase authentication.
  const demoSession = DEMO_ENABLED ? request.cookies.get('demo-session')?.value : undefined;
  let isAuthenticated = !!demoSession;

  if (!isAuthenticated) {
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  }

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      if (pathname.includes('/api/auth') || pathname.includes('/api/profiles/create')) {
        return response;
      }
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Handle authenticated requests but check user status if present
  const userStatus = request.cookies.get('user-status')?.value;

  if (userStatus && userStatus !== 'active') {
    if (pathname.startsWith('/api/') && !pathname.includes('/api/profiles/current')) {
      return NextResponse.json(
        { error: `Access Denied. Account status is: ${userStatus}` },
        { status: 403 }
      );
    }
  }

  return response;
}

// Config to specify which paths the proxy runs on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
