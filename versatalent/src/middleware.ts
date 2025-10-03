import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Check if user is trying to access admin routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    // Check if user is trying to access talent-specific routes
    if (pathname.startsWith('/talent/') && !['admin', 'talent'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow access to auth pages without authentication
        if (pathname.startsWith('/auth/')) {
          return true;
        }

        // Require authentication for dashboard and protected routes
        if (
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/admin') ||
          pathname.startsWith('/talent/') ||
          pathname.startsWith('/api/analytics/')
        ) {
          return !!token;
        }

        // Allow all other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/talent/:path*',
    '/api/analytics/:path*',
    '/auth/:path*'
  ]
};
