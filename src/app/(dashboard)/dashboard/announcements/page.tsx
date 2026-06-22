import React from 'react';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { Megaphone } from 'lucide-react';

export default function AnnouncementsDashboardPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Workspace Announcements"
        description="Share schedule updates, holiday notices, and maintenance window alerts with members."
      />

      <EmptyState
        title="Announcements Stream"
        description="No current announcements published. Check back later for details."
        icon={Megaphone}
      />
    </PageContainer>
  );
}
