'use client';

import React from 'react';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfileDropdown } from './UserProfileDropdown';
import type { StaffProfile } from '@/types';
import { Search } from 'lucide-react';

interface TopNavbarProps {
  profile: StaffProfile | null;
}

export function TopNavbar({ profile }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-20 hidden md:flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-8 backdrop-blur-md">
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <AppBreadcrumbs />
      </div>

      {/* Right Section: Actions, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar Placeholder */}
        <div className="relative w-48 xl:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search operations..."
            disabled
            className="w-full rounded-lg border border-input bg-muted/20 pl-8 pr-3 py-1.5 text-xs text-muted-foreground cursor-not-allowed select-none focus:outline-none"
          />
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center gap-1">
          <NotificationDropdown />
        </div>

        <div className="border-l border-border h-6 shrink-0" />

        <UserProfileDropdown profile={profile} />
      </div>
    </header>
  );
}
