import React from 'react';
import { redirect } from 'next/navigation';
import { serverAuth } from '@/lib/supabase/auth-server';
import { DashboardShell } from '@/components/shared/shell/DashboardShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // 1. Verify user profile exists and is active on the server
  const profile = await serverAuth.getUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!profile.isActive) {
    // Session is active but account is suspended, log out or redirect
    redirect('/login?error=suspended');
  }

  // 2. Hydrate client shell with profile metadata
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
