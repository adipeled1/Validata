import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
const urlToUse = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public assets, static files, and the login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') || // Let auth-related APIs pass if any
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

  const demoSession = request.cookies.get('demo-session')?.value;
  let isAuthenticated = !!demoSession;

  if (!isAuthenticated) {
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  }

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    // For API requests, return a JSON error
    if (pathname.startsWith('/api/')) {
      // Allow API routes to perform login/register operations if we make custom API endpoints
      if (pathname.includes('/api/auth') || pathname.includes('/api/profiles/create') || pathname.includes('/api/chat')) {
        return response;
      }
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // For page requests, redirect to the login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Handle authenticated requests but check user status if present
  const userStatus = request.cookies.get('user-status')?.value;

  // If status is pending or suspended, restrict API routes and certain actions
  if (userStatus && userStatus !== 'active') {
    // We allow fetching the current profile so the UI can check status updates,
    // but block all other clinical trial data APIs
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
