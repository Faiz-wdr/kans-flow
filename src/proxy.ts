import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const url = request.nextUrl.clone();
  
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isLoginRoute = url.pathname === '/login';

  // 1. Check database profile status if authenticated in Auth
  let isProfileValid = false;
  let isProfileSuspended = false;
  
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile && profile.is_deleted !== true) {
        if (profile.is_active) {
          isProfileValid = true;
        } else {
          isProfileSuspended = true;
        }
      }
    } catch (err) {
      console.error('Middleware database profile check error:', err);
    }
  }

  // Helper to clear cookies in responses to prevent loop
  const clearAuthCookies = (res: NextResponse) => {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.*?)\.supabase/)?.[1] || '';
    if (projectRef) {
      const cookiesToClear = [
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token.0`,
        `sb-${projectRef}-auth-token.1`,
      ];
      cookiesToClear.forEach(name => {
        res.cookies.set(name, '', { path: '/', maxAge: 0 });
      });
    }
  };

  if (isDashboardRoute) {
    // Redirect unauthenticated or invalid profile users to login
    if (!user || !isProfileValid) {
      const targetUrl = new URL('/login', request.url);
      
      if (isProfileSuspended) {
        targetUrl.searchParams.set('error', 'suspended');
      } else {
        targetUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      }
      
      const redirectResponse = NextResponse.redirect(targetUrl);
      if (user) {
        clearAuthCookies(redirectResponse);
      }
      return redirectResponse;
    }
  }

  // Redirect authenticated users trying to access login page back to dashboard
  if (isLoginRoute && user && !url.searchParams.has('error') && !url.searchParams.has('logout')) {
    if (isProfileValid) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    } else {
      // Authenticated but profile is not valid/active, sign them out and show login page
      const loginResponse = NextResponse.next();
      clearAuthCookies(loginResponse);
      return loginResponse;
    }
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
