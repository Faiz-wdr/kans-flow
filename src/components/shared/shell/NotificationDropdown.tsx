'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, AlertCircle, UserPlus, Megaphone, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { clientAuth } from '@/lib/supabase/auth-client';
import type { Notification, StaffProfile } from '@/types';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const userProfile = await clientAuth.getUserProfile();
      setProfile(userProfile);

      if (userProfile?.organizationId) {
        // Fetch notifications (RLS filters automatically by org, role, and user)
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const mapped: Notification[] = (data || []).map((row: any) => ({
          id: row.id,
          organizationId: row.organization_id,
          type: row.type,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          targetRole: row.target_role,
          targetUserId: row.target_user_id,
          createdAt: row.created_at,
        }));

        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime updates
    let channel: any;
    const subscribeRealtime = async () => {
      const userProfile = await clientAuth.getUserProfile();
      if (!userProfile?.organizationId) return;

      channel = supabase
        .channel('dashboard_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const newNotif = payload.new;
            // Check filters matching user profile (Realtime safety filter)
            if (
              newNotif.organization_id === userProfile.organizationId &&
              (newNotif.target_role === userProfile.role ||
                newNotif.target_user_id === userProfile.id ||
                (!newNotif.target_role && !newNotif.target_user_id))
            ) {
              const mappedNotif: Notification = {
                id: newNotif.id,
                organizationId: newNotif.organization_id,
                type: newNotif.type,
                title: newNotif.title,
                message: newNotif.message,
                isRead: newNotif.is_read,
                targetRole: newNotif.target_role,
                targetUserId: newNotif.target_user_id,
                createdAt: newNotif.created_at,
              };
              setNotifications((prev) => [mappedNotif, ...prev]);
            }
          }
        )
        .subscribe();
    };

    subscribeRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.organizationId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('organization_id', profile.organizationId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_onboarding':
        return <UserPlus className="h-4 w-4" />;
      case 'new_ticket':
        return <MessageSquare className="h-4 w-4" />;
      case 'vacate_notice':
        return <LogOut className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_onboarding':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'new_ticket':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
      case 'vacate_notice':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
      case 'announcement':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-foreground h-8 w-8 relative rounded-lg"
        title="View Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-background p-1.5 shadow-lg ring-1 ring-black/5 animate-fade-in z-50">
          <div className="px-3 py-2 border-b border-border flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-foreground font-sans">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] text-muted-foreground hover:text-primary font-semibold transition-colors flex items-center gap-0.5"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold font-mono">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground font-sans">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) handleMarkAsRead(item.id);
                  }}
                  className={`p-2.5 hover:bg-muted/50 transition-colors flex gap-3 text-left rounded-md cursor-pointer relative ${
                    !item.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${getNotificationColor(item.type)}`}>
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {item.message}
                    </p>
                    <span className="text-[9px] text-muted-foreground/80 font-mono block">{formatTimeAgo(item.createdAt)}</span>
                  </div>
                  {!item.isRead && (
                    <span className="absolute top-3.5 right-3 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
