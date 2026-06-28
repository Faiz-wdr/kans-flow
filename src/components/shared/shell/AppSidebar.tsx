'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SidebarNavigation } from './SidebarNavigation';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { StaffProfile } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickLinks } from './QuickLinks';

interface AppSidebarProps {
  profile: StaffProfile | null;
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:landscape:flex lg:flex flex-col justify-between border-r border-border bg-card/40 transition-all duration-300 relative z-30 shrink-0 h-screen',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header / Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden select-none">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center font-bold text-white shrink-0 font-serif text-sm">
              K
            </div>
            {!isCollapsed && (
              <span className="text-base font-bold tracking-tight text-foreground font-serif animate-fade-in whitespace-nowrap">
                KANs Flow
              </span>
            )}
          </Link>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:landscape:flex lg:flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted absolute -right-2.5 top-5.5 z-40 transition-colors shadow-sm"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="py-6 overflow-y-auto">
          {isCollapsed ? (
            <div className="space-y-1.5 px-2 text-center text-xs font-semibold text-muted-foreground uppercase select-none">
              —
            </div>
          ) : (
            <div className="px-5 mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none font-sans">
              Main Operations
            </div>
          )}
          <SidebarNavigation role={profile?.role} isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border bg-muted/10 flex flex-col gap-4">
        {profile?.role === 'admin' && <QuickLinks isCollapsed={isCollapsed} />}

        <div className="border-t border-border/50 pt-3 flex flex-col gap-2">
          <div className={cn('flex items-center justify-between', isCollapsed && 'justify-center')}>
            {!isCollapsed && (
              <span className="text-xs text-muted-foreground font-sans">Appearance</span>
            )}
            <ThemeSwitcher role={profile?.role} />
          </div>
        </div>
      </div>
    </aside>
  );
}
