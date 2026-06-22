import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const url = request.nextUrl.clone();
  
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isLoginRoute = url.pathname === '/login';

  // Extract user role from Supabase user metadata
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

  if (isDashboardRoute) {
    // Redirect unauthenticated users to login
    if (!user) {
      url.pathname = '/login';
      // Store redirect target URL
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users trying to access login page (except when they have error/logout params)
  if (isLoginRoute && user && !url.searchParams.has('error') && !url.searchParams.has('logout')) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder items)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
