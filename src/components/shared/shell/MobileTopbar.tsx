'use client';

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfileDropdown } from './UserProfileDropdown';
import type { StaffProfile } from '@/types';

interface MobileTopbarProps {
  profile: StaffProfile | null;
  onMenuOpen: () => void;
}

export function MobileTopbar({ profile, onMenuOpen }: MobileTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex md:hidden h-16 w-full items-center justify-between border-b border-border bg-background px-4">
      {/* Left Section: Menu Toggle Trigger */}
      <button
        onClick={onMenuOpen}
        className="h-9 w-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
        aria-label="Open navigation menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {/* Middle Section: App Logo Branding */}
      <div className="flex items-center gap-1.5 font-serif font-bold text-foreground">
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-white text-[10px]">
          K
        </div>
        <span className="text-sm tracking-tight">KANs Flow</span>
      </div>

      {/* Right Section: Mobile notifications / avatars */}
      <div className="flex items-center gap-1">
        <NotificationDropdown />
        <div className="h-4 w-px bg-border mx-1" />
        <UserProfileDropdown profile={profile} />
      </div>
    </header>
  );
}
