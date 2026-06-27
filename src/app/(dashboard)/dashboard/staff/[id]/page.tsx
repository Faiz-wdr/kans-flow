import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverAuth } from '@/lib/supabase/auth-server';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { RoleBasedGuard } from '@/components/shared/shell/RoleBasedGuard';
import { fetchStaffProfileByIdAction } from '../actions';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Layers,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Briefcase,
  Clock,
  ClipboardList,
  Activity,
  Award,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffProfilePage({ params }: StaffProfilePageProps) {
  const { id } = await params;
  const currentProfile = await serverAuth.getUserProfile();

  // Fetch the specific staff member's profile
  const staffRes = await fetchStaffProfileByIdAction(id);
  if (!staffRes.success || !staffRes.data) {
    notFound();
  }

  const p = staffRes.data;

  return (
    <PageContainer>
      <RoleBasedGuard allowedRoles={['admin']} userRole={currentProfile?.role}>
        {/* Profile Page Header with Back Navigation */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/staff">
            <button className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-sans">
              Staff Directory Profile
            </span>
            <h1 className="text-xl font-bold text-foreground tracking-tight font-serif mt-0.5">
              {p.fullName}
            </h1>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Cards / Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Identity Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border-2 border-primary/20 shadow-inner">
                  {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base font-serif">{p.fullName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                    {p.jobTitle || 'Staff Operator'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-sans',
                      p.role === 'admin'
                        ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    )}
                  >
                    {p.role.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                      p.isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', p.isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-3 text-xs text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Employee ID:</span>
                  <span className="font-mono text-[11px] text-foreground">{p.employeeId || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Date Joined:</span>
                  <span className="text-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Last Login:</span>
                  <span className="text-foreground italic">Syncing session...</span>
                </div>
              </div>
            </div>

            {/* Quick Contact Details */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                Contact Information
              </h3>
              <div className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">Email Address</p>
                    <p className="select-all font-sans break-all">{p.email || 'No email associated'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">Mobile Phone</p>
                    <p className="select-all font-sans">{p.mobileNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Data sections & Placeholders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sector Assignments & Notes */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-foreground text-sm font-serif">Assigned Workspace Sectors</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Operative sectors this staff account holds execution authority for.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.sectors && p.sectors.length > 0 ? (
                    p.sectors.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-semibold"
                      >
                        <Layers className="h-3 w-3" />
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic bg-muted px-2.5 py-1 rounded">
                      No sectors assigned yet.
                    </span>
                  )}
                </div>
              </div>

              {p.notes && (
                <div className="border-t border-border/50 pt-5">
                  <h3 className="font-bold text-foreground text-sm font-serif flex items-center gap-1.5">
                    <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                    Internal Management Notes
                  </h3>
                  <div className="mt-2.5 p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-foreground leading-normal whitespace-pre-wrap">
                    {p.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Preparation Layout Placeholders */}
            <div className="border border-border/70 rounded-xl bg-card/40 overflow-hidden">
              <div className="px-6 py-4 bg-muted/10 border-b border-border">
                <h3 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Operational Metrics & Logs (Future Additions)
                </h3>
              </div>

              <div className="divide-y divide-border/60">
                {/* 1. Assigned Tasks Placeholder */}
                <div className="p-6 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm font-sans flex items-center gap-1.5">
                      Assigned Tasks Queue
                      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/25 px-1.5 py-0.2 rounded-full">
                        Soon
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Monitor ongoing tickets, tasks assigned to this operator, and response durations. (Feature integration planned in Phase 2)
                    </p>
                  </div>
                </div>

                {/* 2. Activity Timeline Placeholder */}
                <div className="p-6 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm font-sans flex items-center gap-1.5">
                      Activity Logs &amp; Audit Trail
                      <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.2 rounded-full">
                        Soon
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      View recent login timestamps, actions performed on clients, seating layouts updates, or support responses. (Feature integration planned in Phase 2)
                    </p>
                  </div>
                </div>

                {/* 3. Performance Placeholder */}
                <div className="p-6 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm font-sans flex items-center gap-1.5">
                      Performance Evaluation
                      <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.2 rounded-full">
                        Soon
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Track coordinator response efficiency, member satisfaction ratings, and completed tickets counts. (Feature integration planned in Phase 3)
                    </p>
                  </div>
                </div>

                {/* 4. Attendance Placeholder */}
                <div className="p-6 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm font-sans flex items-center gap-1.5">
                      Attendance &amp; Check-in Logs
                      <span className="text-[9px] font-bold text-teal-500 uppercase tracking-widest bg-teal-500/10 border border-teal-500/25 px-1.5 py-0.2 rounded-full">
                        Soon
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      View operator daily check-in histories, shift timings, and active working hours calendars. (Feature integration planned in Phase 3)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RoleBasedGuard>
    </PageContainer>
  );
}
