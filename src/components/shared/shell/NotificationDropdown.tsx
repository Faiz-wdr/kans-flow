'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, AlertCircle, UserPlus, Megaphone, LogOut, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clientAuth } from '@/lib/supabase/auth-client';
import { getFCMToken, isNotificationSupported } from '@/lib/firebase/messaging';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  saveFCMToken,
} from '@/lib/notifications/notification-service';
import type { Notification, StaffProfile } from '@/types';

function renderStyledMessage(message: string) {
  if (!message) return null;
  const parts = message.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-foreground dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
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
        const { data, error } = await getNotifications(
          supabase,
          userProfile.organizationId,
          userProfile.role,
          userProfile.id,
          10
        );

        if (error) throw error;
        setNotifications((data || []) as any[]);
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
                // Include metadata fields for deep links
                actionUrl: newNotif.action_url || null,
                referenceModule: newNotif.reference_module || null,
                referenceId: newNotif.reference_id || null,
                priority: newNotif.priority || 'medium',
                richType: newNotif.rich_type || null,
              } as any;
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

  // Auto-register device token on mount / profile load if permission granted
  useEffect(() => {
    async function autoRegisterToken() {
      if (profile?.id) {
        try {
          const supported = await isNotificationSupported();
          if (supported && Notification.permission === 'granted') {
            const token = await getFCMToken();
            if (token) {
              await saveFCMToken(supabase, profile.id, token);
              console.log('[NotificationDropdown] FCM registration token updated.');
            }
          }
        } catch (err) {
          console.warn('[NotificationDropdown] Failed auto-registering FCM token:', err);
        }
      }
    }
    autoRegisterToken();
  }, [profile]);

  const handleNotificationClick = async (item: Notification) => {
    try {
      if (!item.isRead) {
        await markAsRead(supabase, item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }

      setSelectedNotificationId(
        selectedNotificationId === item.id ? null : item.id
      );

      // Deep link navigation
      const actionUrl = (item as any).actionUrl || (item as any).action_url;
      if (actionUrl) {
        router.push(actionUrl);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.organizationId) return;
    try {
      const { error } = await markAllAsRead(supabase, profile.organizationId);
      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await deleteNotification(supabase, id);
      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotificationId === id) {
        setSelectedNotificationId(null);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
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
        <div className="absolute right-0 mt-2 w-96 rounded-lg border border-border bg-background p-1.5 shadow-lg ring-1 ring-black/5 animate-fade-in z-50">
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

          <div className="divide-y divide-border max-h-[450px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground font-sans">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-2.5 hover:bg-muted/50 transition-colors flex gap-3 text-left rounded-md cursor-pointer relative ${
                    !item.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${getNotificationColor(item.type)}`}>
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className={`text-[11px] text-muted-foreground leading-tight transition-all ${
                      selectedNotificationId === item.id ? '' : 'line-clamp-2'
                    }`}>
                      {renderStyledMessage(item.message)}
                    </p>
                    {selectedNotificationId === item.id && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={(e) => handleDeleteNotification(item.id, e)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Delete this notification"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground/80 font-mono block pt-0.5">{formatTimeAgo(item.createdAt)}</span>
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
