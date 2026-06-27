import React from 'react';
import { serverAuth } from '@/lib/supabase/auth-server';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { RoleBasedGuard } from '@/components/shared/shell/RoleBasedGuard';
import { StaffDirectory } from '@/components/staff/StaffDirectory';
import { fetchStaffProfilesAction, fetchSectorsAction } from './actions';

export default async function StaffDashboardPage() {
  const profile = await serverAuth.getUserProfile();

  // Fetch initial staff list and sectors list on server
  const [staffRes, sectorsRes] = await Promise.all([
    fetchStaffProfilesAction({}),
    fetchSectorsAction(),
  ]);

  const initialStaff = staffRes.success && staffRes.data ? staffRes.data : [];
  const sectors = sectorsRes.success && sectorsRes.data ? sectorsRes.data : [];

  return (
    <PageContainer>
      <RoleBasedGuard allowedRoles={['admin']} userRole={profile?.role}>
        <SectionHeader
          title="Staff Account Directory"
          description="Provision operator accounts, manage sector assignments, and monitor active workflows."
        />
        <div className="mt-6">
          <StaffDirectory initialStaff={initialStaff} sectors={sectors} />
        </div>
      </RoleBasedGuard>
    </PageContainer>
  );
}
