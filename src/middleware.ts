import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifySession,
} from '@/lib/auth/session';

/**
 * Redirect unauthenticated visitors away from admin and staff pages.
 * API routes enforce their own auth; this only guards the page shells.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin/login') {
        return NextResponse.next();
      }

      const session = await verifySession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
      if (session?.role === 'admin') {
        return NextResponse.next();
      }

      return redirectToLogin(request, '/admin/login');
    }

    if (pathname.startsWith('/staff/pos')) {
      const session = await verifySession(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
      if (session) {
        return NextResponse.next();
      }

      return redirectToLogin(request, '/staff/login');
    }
  } catch (error) {
    // e.g. SESSION_SECRET missing in production - fail closed
    console.error('[middleware] Session check failed:', error);
    return redirectToLogin(request, pathname.startsWith('/staff') ? '/staff/login' : '/admin/login');
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, loginPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.search = `?returnTo=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/staff/pos/:path*'],
};
