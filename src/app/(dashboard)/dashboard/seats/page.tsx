'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { LoadingState } from '@/components/shared/shell/LoadingState';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/providers/profile-provider';
import { dashboardCache } from '@/lib/cache/dashboard-cache';
import {
  RotateCw,
  Users,
  Calendar,
  UserCheck,
  X,
  AlertCircle,
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  Bell,
  Trash2,
} from 'lucide-react';
import { useDialog } from '@/providers/dialog-provider';
import type { Seat, SeatAssignment, VacateRequest, Client, StaffProfile, WorkspaceZone } from '@/types';

interface ComputedSeatStatus {
  status: 'free' | 'occupied' | 'occupied_soon' | 'vacating_soon';
  clientName?: string;
  clientId?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  remainingDays?: number;
  assignmentId?: string;
}

export default function SeatsDashboardPage() {
  const profile = useProfile();
  const cached = dashboardCache.get<{
    zones: WorkspaceZone[];
    seats: Seat[];
    assignments: any[];
    vacateRequests: VacateRequest[];
    clientsWithoutSeats: Client[];
    selectedZoneId: string;
  }>('seats_data');

  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  // Database states
  const [zones, setZones] = useState<WorkspaceZone[]>(cached?.zones || []);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(cached?.selectedZoneId || '');
  const [seats, setSeats] = useState<Seat[]>(cached?.seats || []);
  const [assignments, setAssignments] = useState<any[]>(cached?.assignments || []);
  const [vacateRequests, setVacateRequests] = useState<VacateRequest[]>(cached?.vacateRequests || []);
  const [clientsWithoutSeats, setClientsWithoutSeats] = useState<Client[]>(cached?.clientsWithoutSeats || []);

  // Selected seat details for drawer
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [selectedSeatAssignment, setSelectedSeatAssignment] = useState<any | null>(null);

  // Quick Action form inputs
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [targetStartDate, setTargetStartDate] = useState<string>('');
  const [expectedVacateDate, setExpectedVacateDate] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const { showAlert, showConfirm } = useDialog();

  const supabase = createClient();

  // Load Data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!cached && seats.length === 0) {
      setLoading(true);
    }

    try {
      if (profile?.organizationId) {
        const orgId = profile.organizationId;

        // Base promises
        const zonesPromise = supabase
          .from('workspace_zones')
          .select('*')
          .eq('organization_id', orgId)
          .order('floor_number', { ascending: true });

        const assignmentsPromise = supabase
          .from('seat_assignments')
          .select('*, clients(*)')
          .eq('organization_id', orgId)
          .eq('is_active', true);

        const vacatePromise = supabase
          .from('vacate_requests')
          .select('*')
          .eq('organization_id', orgId)
          .in('status', ['pending', 'verified']);

        const clientsPromise = supabase
          .from('clients')
          .select('id, organization_id, full_name, email, phone, status, onboarded_at, archived_at, created_at, updated_at')
          .eq('organization_id', orgId)
          .eq('status', 'active');

        let zonesData: any[] = [];
        let assignmentsData: any[] = [];
        let vacateRequestsData: any[] = [];
        let clientsData: any[] = [];
        let seatsData: any[] = [];

        if (selectedZoneId) {
          // Fetch everything concurrently, including seats
          const [zonesRes, assignmentsRes, vacateRes, clientsRes, seatsRes] = await Promise.all([
            zonesPromise,
            assignmentsPromise,
            vacatePromise,
            clientsPromise,
            supabase
              .from('seats')
              .select('*')
              .eq('zone_id', selectedZoneId)
              .order('name', { ascending: true })
          ]);

          zonesData = zonesRes.data || [];
          assignmentsData = assignmentsRes.data || [];
          vacateRequestsData = vacateRes.data || [];
          clientsData = clientsRes.data || [];
          seatsData = seatsRes.data || [];
        } else {
          // Fetch baseline concurrently
          const [zonesRes, assignmentsRes, vacateRes, clientsRes] = await Promise.all([
            zonesPromise,
            assignmentsPromise,
            vacatePromise,
            clientsPromise
          ]);

          zonesData = zonesRes.data || [];
          assignmentsData = assignmentsRes.data || [];
          vacateRequestsData = vacateRes.data || [];
          clientsData = clientsRes.data || [];

          // Get zone to load (fallback to first zone if none selected)
          const activeZones = zonesData;
          if (activeZones.length > 0) {
            const firstZoneId = activeZones[0].id;
            setSelectedZoneId(firstZoneId);
            const { data: fetchedSeatsData } = await supabase
              .from('seats')
              .select('*')
              .eq('zone_id', firstZoneId)
              .order('name', { ascending: true });
            seatsData = fetchedSeatsData || [];
          }
        }

        setZones(zonesData);
        setSeats(seatsData);
        setAssignments(assignmentsData);

        const mappedVacateRequests: VacateRequest[] = vacateRequestsData.map((v: any) => ({
          id: v.id,
          organizationId: v.organization_id,
          clientId: v.client_id,
          seatId: v.seat_id,
          noticeDate: v.notice_date,
          expectedVacateDate: v.expected_vacate_date,
          status: v.status,
          checklistKeyReturned: v.checklist_key_returned,
          checklistDuesCleared: v.checklist_dues_cleared,
          checklistDeskInspected: v.checklist_desk_inspected,
          internalNotes: v.internal_notes,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        }));
        setVacateRequests(mappedVacateRequests);

        // Filter clients without active assignments
        const occupiedClientIds = new Set(
          assignmentsData
            .filter((a: any) => a.is_active)
            .map((a: any) => a.client_id)
        );
        const freeClients: Client[] = clientsData
          .filter((c: any) => !occupiedClientIds.has(c.id))
          .map((c: any) => ({
            id: c.id,
            organizationId: c.organization_id,
            fullName: c.full_name,
            email: c.email,
            phone: c.phone,
            status: c.status,
            onboardedAt: c.onboarded_at,
            archivedAt: c.archived_at,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        setClientsWithoutSeats(freeClients);

        // Save to in-memory cache for instant switching
        dashboardCache.set('seats_data', {
          zones: zonesData,
          seats: seatsData,
          assignments: assignmentsData,
          vacateRequests: mappedVacateRequests,
          clientsWithoutSeats: freeClients,
          selectedZoneId,
        });
      }
    } catch (err) {
      console.error('Error loading seat layout data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedZoneId]);

  useEffect(() => {
    // Subscribe to realtime updates on seats, assignments, and vacate requests
    const channel = supabase
      .channel('seat_layout_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seats' },
        () => loadData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_assignments' },
        () => loadData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vacate_requests' },
        () => loadData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedZoneId]);

  // Compute status map for quick lookup
  const seatStatusMap = React.useMemo(() => {
    const map: Record<string, ComputedSeatStatus> = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    seats.forEach((seat) => {
      // Find active assignment
      const activeAssignment = assignments.find(
        (a) => a.seat_id === seat.id && a.is_active === true
      );

      if (!activeAssignment) {
        map[seat.id] = { status: 'free' };
        return;
      }

      const client = activeAssignment.clients;
      const startDate = activeAssignment.start_date;
      const endDate = activeAssignment.end_date;
      const clientName = client?.full_name || 'Assigned Member';
      const clientId = client?.id;
      const email = client?.email;
      const phone = client?.phone;

      // Check for future joining date (Occupied Soon)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      if (start > now) {
        const diffTime = Math.abs(start.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        map[seat.id] = {
          status: 'occupied_soon',
          clientName,
          clientId,
          email,
          phone,
          startDate,
          endDate,
          remainingDays: diffDays,
          assignmentId: activeAssignment.id,
        };
        return;
      }

      // Check for active vacate requests or 'vacating' status in database (Vacating Soon)
      const activeVacate = vacateRequests.find(
        (v) => v.clientId === client?.id && (v.status === 'pending' || v.status === 'verified')
      );

      if (seat.status === 'vacating' || activeVacate) {
        const vacateDateStr = activeVacate?.expectedVacateDate || endDate;
        if (vacateDateStr) {
          const vacate = new Date(vacateDateStr);
          vacate.setHours(0, 0, 0, 0);
          const diffTime = vacate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          map[seat.id] = {
            status: 'vacating_soon',
            clientName,
            clientId,
            email,
            phone,
            startDate,
            endDate: vacateDateStr,
            remainingDays: diffDays > 0 ? diffDays : 0,
            assignmentId: activeAssignment.id,
          };
          return;
        }
      }

      // Default to active occupied
      map[seat.id] = {
        status: 'occupied',
        clientName,
        clientId,
        email,
        phone,
        startDate,
        endDate,
        assignmentId: activeAssignment.id,
      };
    });

    return map;
  }, [seats, assignments, vacateRequests]);

  // Operational metrics
  const totalSeats = seats.length;
  const occupiedCount = Object.values(seatStatusMap).filter((s) => s.status === 'occupied').length;
  const occupiedSoonCount = Object.values(seatStatusMap).filter((s) => s.status === 'occupied_soon').length;
  const vacatingSoonCount = Object.values(seatStatusMap).filter((s) => s.status === 'vacating_soon').length;
  const freeCount = totalSeats - (occupiedCount + occupiedSoonCount + vacatingSoonCount);

  // Quick Action Handler: Assign Seat
  const handleAssignSeat = async () => {
    if (!selectedSeat || !selectedClientId || !profile?.organizationId) return;
    if (!targetStartDate) {
      showAlert('Date Required', 'Please select a target joining date.');
      return;
    }
    setActionLoading(true);
    try {
      // 1. Create seat assignment
      const { error: assignError } = await supabase
        .from('seat_assignments')
        .insert([
          {
            organization_id: profile.organizationId,
            client_id: selectedClientId,
            seat_id: selectedSeat.id,
            start_date: targetStartDate,
            is_active: true,
          },
        ]);
      if (assignError) throw assignError;

      // 2. Update seat status to occupied (status logic determines colors)
      const { error: seatError } = await supabase
        .from('seats')
        .update({ status: 'occupied' })
        .eq('id', selectedSeat.id);
      if (seatError) throw seatError;

      showAlert('Seat Assigned', `Seat ${selectedSeat.name} successfully assigned!`);
      setSelectedSeat(null);
      loadData(true);
    } catch (err: any) {
      showAlert('Assignment Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action Handler: Mark Vacating
  const handleMarkVacating = async () => {
    if (!selectedSeat || !selectedSeatAssignment || !profile?.organizationId) return;
    if (!expectedVacateDate) {
      showAlert('Date Required', 'Please select an expected vacate date.');
      return;
    }
    setActionLoading(true);
    try {
      // 1. Insert vacate request
      const { error: vacateError } = await supabase
        .from('vacate_requests')
        .insert([
          {
            organization_id: profile.organizationId,
            client_id: selectedSeatAssignment.client_id,
            expected_vacate_date: expectedVacateDate,
            status: 'pending',
          },
        ]);
      if (vacateError) throw vacateError;

      // 2. Update seat status in db to vacating
      const { error: seatError } = await supabase
        .from('seats')
        .update({ status: 'vacating' })
        .eq('id', selectedSeat.id);
      if (seatError) throw seatError;

      showAlert('Status Updated', `Seat ${selectedSeat.name} marked as vacating.`);
      setSelectedSeat(null);
      loadData(true);
    } catch (err: any) {
      showAlert('Operation Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action Handler: Release Seat (Finalize Vacate)
  const handleReleaseSeat = async () => {
    if (!selectedSeat || !selectedSeatAssignment) return;
    const confirmMessage = `Are you sure you want to release seat ${selectedSeat.name}? This will terminate the active lease assignment immediately.`;

    showConfirm('Release Seat', confirmMessage, async () => {
      setActionLoading(true);
      try {
        // 1. Deactivate active assignment
        const { error: assignError } = await supabase
          .from('seat_assignments')
          .update({
            is_active: false,
            end_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', selectedSeatAssignment.id);
        if (assignError) throw assignError;

        // 2. Update seat status to available
        const { error: seatError } = await supabase
          .from('seats')
          .update({ status: 'available' })
          .eq('id', selectedSeat.id);
        if (seatError) throw seatError;

        // 3. Mark any pending vacate requests for this client as completed
        await supabase
          .from('vacate_requests')
          .update({ status: 'completed' })
          .eq('client_id', selectedSeatAssignment.client_id)
          .in('status', ['pending', 'verified']);

        showAlert('Seat Released', `Seat ${selectedSeat.name} has been released and marked free.`);
        setSelectedSeat(null);
        loadData(true);
      } catch (err: any) {
        showAlert('Release Failed', err.message || 'An error occurred.');
      } finally {
        setActionLoading(false);
      }
    });
  };

  // Seat Card Renderer matching structural colors
  const renderSeat = (name: string, label?: string, heightClass = 'h-10') => {
    const seat = seats.find((s) => s.name === name);
    if (!seat) {
      return (
        <div className={`${heightClass} border border-dashed border-border rounded flex items-center justify-center text-[10px] text-muted-foreground bg-muted/20 select-none`}>
          {name}
        </div>
      );
    }

    const info = seatStatusMap[seat.id] || { status: 'free' };

    let bgClass = '';
    let borderClass = '';

    if (info.status === 'occupied') {
      bgClass = 'bg-orange-500 hover:bg-orange-600 text-white';
      borderClass = 'border-orange-600';
    } else if (info.status === 'occupied_soon') {
      bgClass = 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60';
      borderClass = 'border-amber-300 dark:border-amber-900/60';
    } else if (info.status === 'vacating_soon') {
      bgClass = 'bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse';
      borderClass = 'border-yellow-600';
    } else {
      bgClass = 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:text-neutral-300';
      borderClass = 'border-neutral-200 dark:border-neutral-700';
    }

    return (
      <button
        key={seat.id}
        onClick={() => {
          setSelectedSeat(seat);
          const activeAssign = assignments.find((a) => a.seat_id === seat.id && a.is_active);
          setSelectedSeatAssignment(activeAssign || null);

          // Reset forms
          setSelectedClientId('');
          setTargetStartDate(new Date().toISOString().split('T')[0]);
          setExpectedVacateDate('');
        }}
        className={`w-full rounded border flex flex-col items-center justify-center text-xs font-bold font-sans cursor-pointer transition-all duration-150 shadow-xs ${heightClass} ${bgClass} ${borderClass}`}
        title={`${seat.name} - ${info.status.toUpperCase().replace('_', ' ')}`}
      >
        <span>{label || seat.name}</span>
        {info.remainingDays !== undefined && (
          <span className="text-[9px] font-extrabold opacity-90 block mt-0.5 font-mono">
            {info.remainingDays}d
          </span>
        )}
      </button>
    );
  };

  // Static Block Renderer (Hallways, Staircases, Pantries)
  const renderStaticBlock = (label: string, heightClass = 'h-10', borderClass = 'border-border', bgClass = 'bg-muted/30') => {
    return (
      <div className={`w-full rounded border flex items-center justify-center text-[10px] font-bold font-sans text-muted-foreground uppercase tracking-wider select-none ${heightClass} ${borderClass} ${bgClass}`}>
        {label}
      </div>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading workspace visualization layouts..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <SectionHeader
        title="Workspace Floor Map"
        description="Monitor real-time occupancy, coordinate seat allocations, and manage vacating timelines."
        action={
          <div className="flex items-center gap-3">
            {/* Zone Selection Dropdown */}
            {zones.length > 0 && (
              <select
                id="zone-select"
                className="block rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} (Floor {zone.floorNumber})
                  </option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="h-8 text-xs inline-flex items-center gap-1.5"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Operational Stats Legend */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 mt-2 mb-6 text-xs font-sans">
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 block shrink-0" />
            <span className="text-muted-foreground font-semibold">Free / Available</span>
          </div>
          <span className="font-extrabold text-foreground">{freeCount}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-orange-500 border border-orange-600 block shrink-0" />
            <span className="text-muted-foreground font-semibold">Occupied</span>
          </div>
          <span className="font-extrabold text-foreground">{occupiedCount}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-300 block shrink-0" />
            <span className="text-muted-foreground font-semibold">Occupied Soon</span>
          </div>
          <span className="font-extrabold text-foreground">{occupiedSoonCount}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-yellow-500 border border-yellow-600 block shrink-0" />
            <span className="text-muted-foreground font-semibold">Vacating Soon</span>
          </div>
          <span className="font-extrabold text-foreground">{vacatingSoonCount}</span>
        </div>
      </div>

      {/* Visual Workspace Maps Containers */}
      <div className="flex flex-col lg:flex-row gap-6 items-start overflow-x-auto pb-4 max-w-full">

        {/* ==================== LEFT BLOCK: COWORKING SPACE MAP ==================== */}
        <div className="rounded-xl border border-border bg-card p-4 pb-3 shadow-sm min-w-[700px] flex-1">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2.5 mb-3 font-sans">
            Coworking Space
          </h3>

          <div className="space-y-3">
            {/* 1. Study Space (SS1 - SS20) Grid */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => renderSeat(`SS${i + 1}`, undefined, 'h-7'))}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => renderSeat(`SS${i + 11}`, undefined, 'h-7'))}
              </div>
            </div>

            {/* Hallway Spacer */}
            <div className="h-4 bg-muted/20 border border-dashed border-border rounded flex items-center justify-center text-[9px] text-muted-foreground uppercase tracking-widest font-sans select-none font-bold">
              Main Hallway
            </div>

            {/* 2. Middle Section Floorplan layout */}
            <div
              className="grid grid-cols-10 gap-1.5 w-full"
              style={{ display: 'grid', gridTemplateRows: 'repeat(8, minmax(0, 1fr))', minHeight: '340px' }}
            >
              {/* Rooms Left column (R5, R4, R3) */}
              <div className="col-start-1 col-span-3 row-start-1 row-span-2">
                {renderSeat('R5', 'R5', 'h-full')}
              </div>
              <div className="col-start-1 col-span-3 row-start-3 row-span-3">
                {renderSeat('R4', 'R4', 'h-full')}
              </div>
              <div className="col-start-1 col-span-3 row-start-6 row-span-4">
                {renderSeat('R3', 'R3', 'h-full')}
              </div>

              {/* Coworking Desks CS columns */}
              {/* Row 1 */}
              <div className="col-start-4 col-span-1 row-start-1 row-span-1">
                {renderSeat('CS18', 'CS18', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-1 row-span-1">
                {renderSeat('CS19', 'CS19', 'h-full')}
              </div>
              <div className="col-start-6 col-span-1 row-start-1 row-span-1">
                {renderSeat('CS20', 'CS20', 'h-full')}
              </div>

              {/* Row 2: corridor is empty */}

              {/* Row 3 */}
              <div className="col-start-4 col-span-1 row-start-3 row-span-1">
                {renderSeat('CS15', 'CS15', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-3 row-span-1">
                {renderSeat('CS16', 'CS16', 'h-full')}
              </div>
              <div className="col-start-7 col-span-1 row-start-3 row-span-1">
                {renderSeat('CS17', 'CS17', 'h-full')}
              </div>

              {/* Row 4 */}
              <div className="col-start-4 col-span-1 row-start-4 row-span-1">
                {renderSeat('CS13', 'CS13', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-4 row-span-1">
                {renderSeat('CS14', 'CS14', 'h-full')}
              </div>

              {/* Row 5 */}
              <div className="col-start-4 col-span-1 row-start-5 row-span-1">
                {renderSeat('CS10', 'CS10', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-5 row-span-1">
                {renderSeat('CS11', 'CS11', 'h-full')}
              </div>
              <div className="col-start-7 col-span-1 row-start-5 row-span-1">
                {renderSeat('CS12', 'CS12', 'h-full')}
              </div>

              {/* Row 6 */}
              <div className="col-start-4 col-span-1 row-start-6 row-span-1">
                {renderSeat('CS7', 'CS7', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-6 row-span-1">
                {renderSeat('CS8', 'CS8', 'h-full')}
              </div>
              <div className="col-start-7 col-span-1 row-start-6 row-span-1">
                {renderSeat('CS9', 'CS9', 'h-full')}
              </div>

              {/* Row 7 */}
              <div className="col-start-4 col-span-1 row-start-7 row-span-1">
                {renderSeat('CS4', 'CS4', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-7 row-span-1">
                {renderSeat('CS5', 'CS5', 'h-full')}
              </div>
              <div className="col-start-7 col-span-1 row-start-7 row-span-1">
                {renderSeat('CS6', 'CS6', 'h-full')}
              </div>

              {/* Row 8 */}
              <div className="col-start-4 col-span-1 row-start-8 row-span-1">
                {renderSeat('CS1', 'CS1', 'h-full')}
              </div>
              <div className="col-start-5 col-span-1 row-start-8 row-span-1">
                {renderSeat('CS2', 'CS2', 'h-full')}
              </div>
              <div className="col-start-7 col-span-1 row-start-8 row-span-1">
                {renderSeat('CS3', 'CS3', 'h-full')}
              </div>

              {/* Right column (Stair, Pantry, R1) */}
              <div className="col-start-8 col-span-3 row-start-1 row-span-2">
                {renderStaticBlock('Stair', 'h-full')}
              </div>
              <div className="col-start-8 col-span-3 row-start-3 row-span-3">
                {renderStaticBlock('Pantry', 'h-full')}
              </div>
              <div className="col-start-8 col-span-3 row-start-6 row-span-3">
                {renderSeat('R1', 'Room R1', 'h-full')}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT BLOCK: PRIVATE CABINS MAP ==================== */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm min-w-[500px] w-full max-w-[580px]">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-3 mb-4 font-sans">
            Private Cabins - Business Centre
          </h3>

          <div
            className="grid grid-cols-10 gap-2 w-full"
            style={{ display: 'grid', gridTemplateRows: '1.5fr 1fr 1.2fr 1fr 2fr', height: '260px' }}
          >
            {/* Row 1 */}
            <div className="col-start-1 col-span-3 row-start-1 row-span-1">
              {renderSeat('C5', 'C5', 'h-full')}
            </div>
            <div className="col-start-4 col-span-4 row-start-1 row-span-2">
              {renderSeat('C8', 'C8', 'h-full')}
            </div>
            <div className="col-start-8 col-span-3 row-start-1 row-span-1">
              {renderStaticBlock('Pantry', 'h-full')}
            </div>

            {/* Row 2 */}
            <div className="col-start-1 col-span-2 row-start-2 row-span-1">
              {renderSeat('C4', 'C4', 'h-full')}
            </div>
            <div className="col-start-3 col-span-1 row-start-2 row-span-3">
              <div className="h-full w-full bg-muted/20 border-r border-l border-dashed border-border rounded flex items-center justify-center text-[10px] font-sans font-bold text-muted-foreground [writing-mode:vertical-lr] uppercase tracking-widest select-none">
                P1
              </div>
            </div>
            <div className="col-start-8 col-span-1 row-start-2 row-span-3">
              <div className="h-full w-full bg-muted/20 border-r border-l border-dashed border-border rounded flex items-center justify-center text-[10px] font-sans font-bold text-muted-foreground [writing-mode:vertical-lr] uppercase tracking-widest select-none">
                P2
              </div>
            </div>
            <div className="col-start-9 col-span-2 row-start-2 row-span-2">
              {renderStaticBlock('Stair', 'h-full')}
            </div>

            {/* Row 3 */}
            <div className="col-start-1 col-span-2 row-start-3 row-span-1">
              {renderSeat('C3', 'C3', 'h-full')}
            </div>
            <div className="col-start-4 col-span-2 row-start-3 row-span-1">
              {renderSeat('C6', 'C6', 'h-full')}
            </div>
            <div className="col-start-6 col-span-2 row-start-3 row-span-1">
              {renderSeat('C7', 'C7', 'h-full')}
            </div>

            {/* Row 4 */}
            <div className="col-start-1 col-span-2 row-start-4 row-span-1">
              {renderSeat('C2', 'C2', 'h-full')}
            </div>
            <div className="col-start-4 col-span-4 row-start-4 row-span-1">
              {renderStaticBlock('Discussion Room', 'h-full')}
            </div>
            <div className="col-start-9 col-span-2 row-start-4 row-span-1">
              {renderSeat('C9', 'C9', 'h-full')}
            </div>

            {/* Row 5 */}
            <div className="col-start-1 col-span-2 row-start-5 row-span-1">
              {renderSeat('C1', 'C1', 'h-full')}
            </div>
            <div className="col-start-3 col-span-6 row-start-5 row-span-1">
              {renderStaticBlock('Reception', 'h-full', 'border-primary/20', 'bg-primary/5 text-primary font-extrabold')}
            </div>
            <div className="col-start-9 col-span-2 row-start-5 row-span-1">
              {renderSeat('C10', 'C10', 'h-full')}
            </div>
          </div>
        </div>

      </div>

      {/* ==================== INTERACTIVE SEAT DETAIL DRAWER ==================== */}
      {selectedSeat && (() => {
        const info = seatStatusMap[selectedSeat.id] || { status: 'free' };
        const isFree = info.status === 'free';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedSeat(null)}
            />

            {/* Modal Body */}
            <div className="relative w-full max-w-md bg-background border-l border-border h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-slide-in">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Seat Configuration: {selectedSeat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      Category: {selectedSeat.type === 'study' ? 'Study Desk' : selectedSeat.type === 'coworking' ? 'Coworking Space' : 'Private Cabin'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSeat(null)}
                    className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Status Indicator Banner */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Current Status
                  </span>
                  <div
                    className={`rounded-lg border p-4 text-xs font-semibold flex items-center justify-between ${info.status === 'occupied'
                      ? 'bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400'
                      : info.status === 'occupied_soon'
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                        : info.status === 'vacating_soon'
                          ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-600 dark:text-yellow-400'
                          : 'bg-neutral-500/10 border-neutral-500/25 text-neutral-600 dark:text-neutral-400'
                      }`}
                  >
                    <span className="uppercase tracking-widest text-xs font-bold">
                      {info.status.replace('_', ' ')}
                    </span>
                    {info.remainingDays !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{info.remainingDays} days remaining</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Occupant Details Card */}
                {!isFree && (
                  <div className="space-y-3">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Occupant Details
                    </span>
                    <div className="rounded-lg border border-border p-4 bg-muted/5 space-y-3 text-xs text-foreground">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-bold">{info.clientName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{info.email || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{info.phone || '—'}</span>
                      </div>
                      <div className="pt-2.5 border-t border-border/60 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Joining Date:</span>
                          </span>
                          <span className="font-semibold">{info.startDate ? new Date(info.startDate).toLocaleDateString() : '—'}</span>
                        </div>
                        {info.endDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-yellow-500" />
                              <span>Expected Vacate Date:</span>
                            </span>
                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                              {new Date(info.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Operational Workflows Panels */}
                <div className="pt-4 border-t border-border space-y-4">
                  {/* Action 1: Assign (If Free) */}
                  {isFree && (
                    <div className="space-y-3 bg-primary/5 border border-primary/10 p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span>Allocate Desk Lease</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label htmlFor="client-select" className="text-muted-foreground font-semibold">Select Member Profile:</label>
                          <select
                            id="client-select"
                            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus-visible:outline-none text-foreground"
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                          >
                            <option value="">Choose active client...</option>
                            {clientsWithoutSeats.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.fullName} ({client.email})
                              </option>
                            ))}
                            {clientsWithoutSeats.length === 0 && (
                              <option disabled value="">No unassigned active clients found!</option>
                            )}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="joining-date" className="text-muted-foreground font-semibold">Joining / Lease Start Date:</label>
                          <input
                            id="joining-date"
                            type="date"
                            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                            value={targetStartDate}
                            onChange={(e) => setTargetStartDate(e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white mt-1 border border-emerald-600"
                          disabled={!selectedClientId || !targetStartDate || actionLoading}
                          onClick={handleAssignSeat}
                        >
                          {actionLoading ? 'Assigning...' : 'Assign Seat'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action 2: Mark Vacating (If Occupied and not already vacating) */}
                  {info.status === 'occupied' && (
                    <div className="space-y-3 bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-yellow-500" />
                        <span>Schedule Vacate Date</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label htmlFor="vacate-date" className="text-muted-foreground font-semibold">Expected Vacate Date:</label>
                          <input
                            id="vacate-date"
                            type="date"
                            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                            value={expectedVacateDate}
                            onChange={(e) => setExpectedVacateDate(e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full text-xs bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-600"
                          disabled={!expectedVacateDate || actionLoading}
                          onClick={handleMarkVacating}
                        >
                          {actionLoading ? 'Updating...' : 'Schedule Vacate'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions (Release / Close) */}
              <div className="border-t border-border pt-4 mt-6">
                {!isFree ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="text-xs flex items-center justify-center gap-1"
                      disabled={actionLoading}
                      onClick={handleReleaseSeat}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Release Seat</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setSelectedSeat(null)}
                    >
                      Close Details
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => setSelectedSeat(null)}
                  >
                    Close Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </PageContainer>
  );
}
