'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { SidebarNavigation } from './SidebarNavigation';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { StaffProfile } from '@/types';
import { X } from 'lucide-react';
import { QuickLinks } from './QuickLinks';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StaffProfile | null;
}

export function MobileSidebarDrawer({ isOpen, onClose, profile }: MobileSidebarDrawerProps) {
  // Prevent body scrolling when overlay drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border flex flex-col justify-between shadow-2xl animate-slide-in z-50 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border">
            <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center font-bold text-white font-serif text-sm">
                K
              </div>
              <span className="text-base font-bold tracking-tight text-foreground font-serif">
                KANs Flow
              </span>
            </Link>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="py-4">
            <div className="px-5 mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none font-sans">
              Main Operations
            </div>
            <SidebarNavigation role={profile?.role} onLinkClick={onClose} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex flex-col gap-4">
          {profile?.role === 'admin' && <QuickLinks isCollapsed={false} />}

          <div className="border-t border-border/50 pt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-sans">Appearance</span>
              <ThemeSwitcher role={profile?.role} />
            </div>
            <div className="flex items-center gap-2.5 border-t border-border pt-3 mt-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold font-serif text-sm border border-primary/20">
                {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate">{profile?.fullName || 'Active User'}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">{profile?.role || 'staff'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
