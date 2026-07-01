import React from 'react';
import { serverAuth } from '@/lib/supabase/auth-server';
import { TimelineManager } from '@/components/timeline/TimelineManager';
import { fetchTimelineAction } from './timeline-actions';

export default async function SettingsDashboardPage() {
  const profile = await serverAuth.getUserProfile();

  // Fetch initial company timeline data on the server
  const timelineRes = await fetchTimelineAction();
  const initialMilestones = timelineRes.success && timelineRes.data ? timelineRes.data : [];

  return (
    <TimelineManager
      initialMilestones={initialMilestones}
      userRole={profile?.role}
    />
  );
}
