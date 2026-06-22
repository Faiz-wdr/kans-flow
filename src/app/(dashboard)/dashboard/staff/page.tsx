import React from 'react';
import { serverAuth } from '@/lib/supabase/auth-server';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { RoleBasedGuard } from '@/components/shared/shell/RoleBasedGuard';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { ShieldAlert } from 'lucide-react';

export default async function StaffDashboardPage() {
  const profile = await serverAuth.getUserProfile();

  return (
    <PageContainer>
      <RoleBasedGuard allowedRoles={['admin']} userRole={profile?.role}>
        <SectionHeader
          title="Staff Account Directory"
          description="Provision operator accounts, manage shifts, and monitor activity timelines."
        />
        <EmptyState
          title="Active Operator Directory"
          description="Manage staff members, roles, and authorization keys. Staff members will see Access Denied."
          icon={ShieldAlert}
        />
      </RoleBasedGuard>
    </PageContainer>
  );
}
