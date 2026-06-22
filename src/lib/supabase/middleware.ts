import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl } from './client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh token if expired
  const mockRole = request.cookies.get('sb-mock-role')?.value;
  const isMockEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
  if (isMockEnabled && (mockRole === 'admin' || mockRole === 'staff')) {
    const mockUser = {
      id: mockRole === 'admin' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
      app_metadata: { role: mockRole },
      user_metadata: { role: mockRole, full_name: mockRole === 'admin' ? 'Mock Admin User' : 'Mock Staff Member' },
      email: `${mockRole}@kansflow.local`,
    };
    return { supabaseResponse, user: mockUser as any };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
