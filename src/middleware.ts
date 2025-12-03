// import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporary simple middleware - bypass auth for now
export function middleware(request: NextRequest) {
  // For now, just allow all requests to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/talent/:path*',
    '/api/analytics/:path*',
    '/auth/:path*'
  ]
};
