import { NextResponse } from 'next/server';

export function proxy(request) {
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

  // 2. Check for authentication cookies
  // We check for either a Supabase token or a active Demo session
  const token = request.cookies.get('sb-access-token')?.value;
  const demoSession = request.cookies.get('demo-session')?.value;

  const isAuthenticated = !!token || !!demoSession;

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    // For API requests, return a JSON error
    if (pathname.startsWith('/api/')) {
      // Allow API routes to perform login/register operations if we make custom API endpoints
      if (pathname.includes('/api/auth') || pathname.includes('/api/profiles/create')) {
        return NextResponse.next();
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

  return NextResponse.next();
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
