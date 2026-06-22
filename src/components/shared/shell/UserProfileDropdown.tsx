'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clientAuth } from '@/lib/supabase/auth-client';
import type { StaffProfile } from '@/types';
import { LogOut, User, Shield } from 'lucide-react';

interface UserProfileDropdownProps {
  profile: StaffProfile | null;
}

export function UserProfileDropdown({ profile }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const { error } = await clientAuth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    }
    router.refresh();
    router.push('/login');
  };

  const initial = profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-left focus:outline-none group/avatar"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold font-serif text-sm group-hover/avatar:bg-primary/20 transition-colors border border-primary/25">
          {initial}
        </div>
        <div className="hidden md:block text-xs max-w-[120px] truncate">
          <p className="font-semibold text-foreground leading-tight truncate">
            {profile?.fullName || 'Active User'}
          </p>
          <p className="text-[10px] text-muted-foreground capitalize leading-tight">
            {profile?.role || 'staff'}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background p-1.5 shadow-lg ring-1 ring-black/5 animate-fade-in z-50">
          <div className="px-2.5 py-2 border-b border-border mb-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.fullName || 'Workspace User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.role === 'admin' ? 'Administrator' : 'Staff Member'}
            </p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Org: {profile?.organizationId ? 'Active Workspace' : 'Unassigned'}</span>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
