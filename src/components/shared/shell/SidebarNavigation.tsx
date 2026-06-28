'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Map,
  Users,
  LifeBuoy,
  ShieldAlert,
  Megaphone,
  Settings,
} from 'lucide-react';

interface SidebarNavigationProps {
  role: UserRole | undefined;
  onLinkClick?: () => void; // Used for closing mobile drawers
  isCollapsed?: boolean;
}

export function SidebarNavigation({ role = 'staff', onLinkClick, isCollapsed = false }: SidebarNavigationProps) {
  const pathname = usePathname();

  // Navigation schema mappings
  const allLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'staff'],
    },
    {
      name: 'Seat Layout',
      href: '/dashboard/seats',
      icon: Map,
      roles: ['admin', 'staff'],
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
      roles: ['admin', 'staff'],
    },
    {
      name: 'Support Requests',
      href: '/dashboard/support',
      icon: LifeBuoy,
      roles: ['admin', 'staff'],
    },
    {
      name: 'Staff',
      href: '/dashboard/staff',
      icon: ShieldAlert,
      roles: ['admin'],
    },
    {
      name: 'Announcements',
      href: '/dashboard/announcements',
      icon: Megaphone,
      roles: ['admin', 'staff'],
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  // Filter links by active role mapping
  const visibleLinks = allLinks.filter((link) => link.roles.includes(role));

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [openSupportCount, setOpenSupportCount] = useState<number>(0);

  // Update last viewed support timestamp when visiting the page
  useEffect(() => {
    if (pathname.startsWith('/dashboard/support')) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lastViewedSupport', new Date().toISOString());
        } catch (e) {
          console.warn('localStorage is not available to write:', e);
        }
      }
      setOpenSupportCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial count of pending onboarding requests
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('onboarding_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error && count !== null) {
          setPendingCount(count);
        }
      } catch (err) {
        console.error('Error fetching onboarding count:', err);
      }
    };

    // Fetch initial count of open support requests
    const fetchSupportCount = async () => {
      try {
        let lastViewed: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            lastViewed = localStorage.getItem('lastViewedSupport');
          } catch (e) {
            console.warn('localStorage is not available:', e);
          }
        }
        let query = supabase
          .from('support_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');

        if (lastViewed) {
          query = query.gt('created_at', lastViewed);
        }

        const { count, error } = await query;
        
        if (!error && count !== null) {
          setOpenSupportCount(count);
        }
      } catch (err) {
        console.error('Error fetching support count:', err);
      }
    };

    fetchCount();
    fetchSupportCount();

    // Listen to local custom event updates
    window.addEventListener('onboarding-requests-updated', fetchCount);
    window.addEventListener('support-requests-updated', fetchSupportCount);

    // Subscribe to realtime changes on onboarding_requests using unique instance channel names
    const onboardingChannelName = `sidebar-onboarding-${Math.random().toString(36).substring(2, 9)}`;
    const onboardingChannel = supabase
      .channel(onboardingChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'onboarding_requests' },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    // Subscribe to realtime changes on support_requests
    const supportChannelName = `sidebar-support-${Math.random().toString(36).substring(2, 9)}`;
    const supportChannel = supabase
      .channel(supportChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_requests' },
        () => {
          fetchSupportCount();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('onboarding-requests-updated', fetchCount);
      window.removeEventListener('support-requests-updated', fetchSupportCount);
      supabase.removeChannel(onboardingChannel);
      supabase.removeChannel(supportChannel);
    };
  }, []);

  return (
    <nav className="space-y-1.5 px-2">
      {visibleLinks.map((item) => {
        const Icon = item.icon;
        const isClients = item.name === 'Clients';
        const isSupport = item.name === 'Support Requests';
        // Exact match or subroute match
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onLinkClick}
            title={
              isCollapsed
                ? `${item.name}${isClients && pendingCount > 0 ? ` (${pendingCount} pending)` : ''}${
                    isSupport && openSupportCount > 0 && !isActive ? ` (${openSupportCount} new)` : ''
                  }`
                : undefined
            }
            className={cn(
              'group flex items-center rounded-lg transition-all py-2 text-sm font-medium relative',
              isCollapsed ? 'justify-center px-0 gap-0' : 'px-3 gap-3',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent'
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {isCollapsed && isClients && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2 rounded-full bg-primary" />
              )}
              {isCollapsed && isSupport && openSupportCount > 0 && !isActive && (
                <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2 rounded-full bg-orange-500" />
              )}
            </div>
            {!isCollapsed && <span className="font-sans">{item.name}</span>}
            {!isCollapsed && isClients && pendingCount > 0 && (
              <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm animate-pulse">
                {pendingCount}
              </span>
            )}
            {!isCollapsed && isSupport && openSupportCount > 0 && !isActive && (
              <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                {openSupportCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
