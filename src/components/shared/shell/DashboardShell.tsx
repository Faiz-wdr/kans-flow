'use client';

import React, { useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopNavbar } from './TopNavbar';
import { MobileTopbar } from './MobileTopbar';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import type { StaffProfile } from '@/types';

interface DashboardShellProps {
  profile: StaffProfile | null;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Synchronize role theme on mount and clean up on unmount (leaving dashboard)
  useEffect(() => {
    const role = profile?.role || 'staff';
    const themeKey = `theme-${role}`;
    const savedTheme = localStorage.getItem(themeKey) || 'light';

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [profile?.role]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Desktop Left Sidebar */}
      <AppSidebar profile={profile} />

      {/* 2. Main Content Stream Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header Top Bar */}
        <MobileTopbar profile={profile} onMenuOpen={() => setIsMobileMenuOpen(true)} />

        {/* Desktop Top Sticky Nav Bar */}
        <TopNavbar profile={profile} />

        {/* Page Inner Content Container */}
        <main className="flex-1 overflow-y-auto bg-muted/10 outline-none">
          {children}
        </main>
      </div>

      {/* 3. Mobile Left Navigation Drawer */}
      <MobileSidebarDrawer
        profile={profile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}
