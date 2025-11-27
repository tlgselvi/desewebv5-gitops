/**
 * Next.js Middleware
 * Handles authentication, redirects, and security headers
 * 
 * This middleware runs on the Edge runtime and intercepts requests
 * before they reach the page components.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/mcp',
  '/admin',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/login',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Check if the path matches any of the given routes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Add security headers to the response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes and static files
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Get token from cookies or authorization header
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // Check if user is authenticated (basic check - token exists)
  // Note: Full JWT validation should happen in API routes
  const isAuthenticated = !!token;

  // Redirect authenticated users away from auth routes
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Protect dashboard and MCP routes
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  // Add security headers and continue
  return addSecurityHeaders(NextResponse.next());
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

