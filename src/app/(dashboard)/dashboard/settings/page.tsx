import React from 'react';
import { serverAuth } from '@/lib/supabase/auth-server';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { RoleBasedGuard } from '@/components/shared/shell/RoleBasedGuard';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { Settings } from 'lucide-react';

export default async function SettingsDashboardPage() {
  const profile = await serverAuth.getUserProfile();

  return (
    <PageContainer>
      <RoleBasedGuard allowedRoles={['admin']} userRole={profile?.role}>
        <SectionHeader
          title="System Settings"
          description="Configure tenant branding, multi-tenant features, RLS tokens, and active metadata triggers."
        />
        <EmptyState
          title="Configuration Panel"
          description="Manage global organization variables, storage vaults, and notification triggers."
          icon={Settings}
        />
      </RoleBasedGuard>
    </PageContainer>
  );
}
