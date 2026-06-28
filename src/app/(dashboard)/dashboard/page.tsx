import React from 'react';
import { serverAuth } from '@/lib/supabase/auth-server';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { LayoutDashboard } from 'lucide-react';

export default async function DashboardPage() {
  const profile = await serverAuth.getUserProfile();
  const isAdmin = profile?.role === 'admin';

  return (
    <PageContainer>
      <SectionHeader
        title="Workspace Operations"
        description={
          isAdmin
            ? `Admin portal for KANs HUB. Managed by ${profile?.fullName || 'Administrator'}.`
            : `Staff portal for KANs HUB. Active queues for ${profile?.fullName || 'Staff Member'}.`
        }
      />

      {/* Basic Metrics Shell Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Occupancy
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground font-serif">84%</p>
          <p className="mt-1 text-xs text-muted-foreground">+3% increase since last week</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available Desks
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground font-serif">16</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all floors &amp; cabins</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending Onboarding
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground font-serif">4 Requests</p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting seat allocation</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Tickets
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground font-serif text-destructive">2 Open</p>
          <p className="mt-1 text-xs text-muted-foreground">Assigned operational tasks</p>
        </div>
      </div>

      {/* Main operational queues placeholders */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <EmptyState
          title="Onboarding Pipeline"
          description="Client onboarding requests waiting to be validated and assigned to workspace desks."
          icon={LayoutDashboard}
        />

        <EmptyState
          title="Active Support Tasks"
          description="Support requests logged by workspace members. Double click to assign to staff."
          icon={LayoutDashboard}
        />
      </div>
    </PageContainer>
  );
}
