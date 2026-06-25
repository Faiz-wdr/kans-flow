'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { LoadingState } from '@/components/shared/shell/LoadingState';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clientAuth } from '@/lib/supabase/auth-client';
import { useDialog } from '@/providers/dialog-provider';
import { createNotification } from '@/lib/notifications/notification-service';
import { getSupportRequests, updateSupportRequest, createSupportNote, deleteSupportRequest, deleteSupportNote } from '@/services/db/support';
import type { SupportRequest, SupportNote, StaffProfile } from '@/types';
import {
  LifeBuoy,
  RotateCw,
  Eye,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  ExternalLink,
  ChevronRight,
  User,
  Calendar,
  Trash2,
} from 'lucide-react';

function SupportDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const searchParams = useSearchParams();

  // Data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'in_progress' | 'waiting' | 'resolved'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Selected Ticket details (modal/drawer)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notePosting, setNotePosting] = useState(false);

  // Status transitions
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  // Staff registry (for assignment list representation)
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  const { showAlert, showConfirm } = useDialog();

  const supabase = createClient();

  // Load Data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Fetch user profile
      const userProfile = await clientAuth.getUserProfile();
      setProfile(userProfile);

      if (userProfile?.organizationId) {
        // Run database queries concurrently
        const [ticketsRes, staffRes] = await Promise.all([
          supabase
            .from('support_requests')
            .select('*, clients(id, full_name, email, phone)')
            .eq('organization_id', userProfile.organizationId)
            .order('created_at', { ascending: false }),
          supabase
            .from('staff_profiles')
            .select('*')
            .eq('organization_id', userProfile.organizationId)
        ]);

        setTickets(ticketsRes.data || []);
        const mappedStaffList = (staffRes.data || []).map((s: any) => ({
          id: s.id,
          organizationId: s.organization_id,
          fullName: s.full_name,
          role: s.role,
          isActive: s.is_active,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
        setStaffList(mappedStaffList);
      }
    } catch (err) {
      console.error('Error loading support dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Support deep link query parameter routing
  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId && tickets.length > 0) {
      const matchedTicket = tickets.find((t) => t.id === ticketId);
      if (matchedTicket && (!selectedTicket || selectedTicket.id !== ticketId)) {
        handleOpenTicket(matchedTicket);
      }
    }
  }, [searchParams, tickets]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile?.organizationId) return;

    const channel = supabase
      .channel('support_tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_requests' },
        () => loadData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_notes' },
        () => {
          // If a note table change occurs and a ticket is open, reload notes
          if (selectedTicket) {
            loadTicketNotes(selectedTicket.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organizationId, selectedTicket?.id]);

  // Load notes for a specific ticket
  const loadTicketNotes = async (requestId: string) => {
    try {
      const { data: notesData, error } = await supabase
        .from('support_notes')
        .select('*, author:staff_profiles(full_name)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNotes(notesData || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  // Open Ticket detail drawer
  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setNewNote('');
    setResolutionNote('');
    setShowResolutionForm(false);
    loadTicketNotes(ticket.id);
  };

  // Assign ticket to current staff
  const handleAssignToMe = async () => {
    if (!selectedTicket || !profile) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .update({
          assigned_to: profile.id,
          status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id)
        .select('*, clients(id, full_name, email, phone)')
        .single();

      if (error) throw error;
      
      // Post an internal note audit log
      await createSupportNote(supabase, selectedTicket.id, profile.id, `Ticket assigned to ${profile.fullName}.`);

      // Create assignment notification
      const notificationMsg = `Support Request **${selectedTicket.ticket_number || '#0000'}** assigned to **${profile.fullName}**.`;
      await createNotification(supabase, {
        organizationId: profile.organizationId,
        type: 'support_assigned',
        recipient: { type: 'admin_staff' },
        title: 'Ticket Assigned',
        body: notificationMsg,
        referenceModule: 'support',
        referenceId: selectedTicket.id,
        priority: 'low',
        actorId: profile.id,
      });

      setSelectedTicket(data);
      loadData(true);
      loadTicketNotes(selectedTicket.id);
      window.dispatchEvent(new CustomEvent('support-requests-updated'));
    } catch (err: any) {
      showAlert('Assignment Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket || !profile) return;

    if (newStatus === 'resolved') {
      setShowResolutionForm(true);
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id)
        .select('*, clients(id, full_name, email, phone)')
        .single();

      if (error) throw error;

      // Log status transition
      await createSupportNote(supabase, selectedTicket.id, profile.id, `Ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}.`);

      setSelectedTicket(data);
      loadData(true);
      loadTicketNotes(selectedTicket.id);
      window.dispatchEvent(new CustomEvent('support-requests-updated'));
    } catch (err: any) {
      showAlert('Status Update Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Resolution Details
  const handleResolveTicket = async () => {
    if (!selectedTicket || !profile || !resolutionNote) {
      showAlert('Resolution Details Required', 'Please enter resolution notes to close the ticket.');
      return;
    }

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('support_requests')
        .update({
          status: 'resolved',
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', selectedTicket.id)
        .select('*, clients(id, full_name, email, phone)')
        .single();

      if (error) throw error;

      // 1. Post Resolution Notes as an internal timeline note
      await createSupportNote(
        supabase, 
        selectedTicket.id, 
        profile.id, 
        `[RESOLUTION NOTES]: ${resolutionNote}`
      );

      // 2. Create completion notification for Admins/Staff
      const notificationMsg = `Support Request **${selectedTicket.ticket_number || '#0000'}** resolved by **${profile.fullName}**.`;
      await createNotification(supabase, {
        organizationId: profile.organizationId,
        type: 'support_resolved',
        recipient: { type: 'admin_staff' },
        title: 'Ticket Resolved',
        body: notificationMsg,
        referenceModule: 'support',
        referenceId: selectedTicket.id,
        priority: 'medium',
        actorId: profile.id,
      });

      setSelectedTicket(data);
      setShowResolutionForm(false);
      loadData(true);
      loadTicketNotes(selectedTicket.id);
      window.dispatchEvent(new CustomEvent('support-requests-updated'));
    } catch (err: any) {
      showAlert('Resolution Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Vacating Request
  const handleApproveVacate = async () => {
    if (!selectedTicket || !profile) return;
    
    if (!selectedTicket.expected_vacate_date) {
      showAlert('Date Required', 'Expected vacate date must be set before approving.');
      return;
    }

    setActionLoading(true);
    try {
      // 1. Fetch client's seat
      const { data: clientData } = await supabase
        .from('clients')
        .select('seat_id')
        .eq('id', selectedTicket.client_id)
        .single();
        
      let seatId = clientData?.seat_id;
      if (!seatId && selectedTicket.seat_number) {
        const { data: seatData } = await supabase
          .from('seats')
          .select('id')
          .eq('name', selectedTicket.seat_number)
          .eq('organization_id', profile.organizationId)
          .single();
        seatId = seatData?.id;
      }

      if (!seatId) {
        throw new Error('Could not resolve client seat assignment.');
      }

      // 2. Insert into vacate_requests table
      const { error: vacateError } = await supabase
        .from('vacate_requests')
        .insert([
          {
            organization_id: profile.organizationId,
            client_id: selectedTicket.client_id,
            seat_id: seatId,
            notice_date: new Date().toISOString().split('T')[0],
            expected_vacate_date: selectedTicket.expected_vacate_date,
            status: 'pending',
          }
        ]);
      if (vacateError) throw vacateError;

      // 3. Update seat status to 'vacating' and vacate_date in db
      const { error: seatError } = await supabase
        .from('seats')
        .update({ 
          status: 'vacating',
          vacate_date: selectedTicket.expected_vacate_date
        })
        .eq('id', seatId);
      if (seatError) throw seatError;

      // 4. Update client status to 'vacating' in db
      const { error: clientError } = await supabase
        .from('clients')
        .update({ 
          status: 'vacating', 
          vacate_notice_at: new Date().toISOString() 
        })
        .eq('id', selectedTicket.client_id);
      if (clientError) throw clientError;

      // 5. Update support request status to 'resolved'
      const now = new Date().toISOString();
      const { data: updatedTicket, error: ticketError } = await supabase
        .from('support_requests')
        .update({
          status: 'resolved',
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', selectedTicket.id)
        .select('*, clients(id, full_name, email, phone)')
        .single();
      if (ticketError) throw ticketError;

      // Post an internal note audit log
      await createSupportNote(
        supabase,
        selectedTicket.id,
        profile.id,
        `[VACATE APPROVED]: Vacate request approved for expected date: ${selectedTicket.expected_vacate_date}. Client and seat marked as vacating.`
      );

      showAlert('Approval Successful', 'Vacate request approved! Seat layout updated.');
      setSelectedTicket(updatedTicket);
      loadData(true);
      loadTicketNotes(selectedTicket.id);
      window.dispatchEvent(new CustomEvent('support-requests-updated'));
    } catch (err: any) {
      showAlert('Approval Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Support Request Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    showConfirm(
      'Confirm Deletion',
      'Are you sure you want to permanently delete this support request? All associated internal notes will also be deleted.',
      async () => {
        setActionLoading(true);
        try {
          const { error } = await deleteSupportRequest(supabase, ticketId);
          if (error) throw error;

          // Close details if the deleted ticket is currently selected
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(null);
          }

          // Refresh data to update the table lists
          loadData(true);

          // Dispatch event to update sidebar count
          window.dispatchEvent(new CustomEvent('support-requests-updated'));
        } catch (err: any) {
          showAlert('Deletion Failed', err.message || 'An error occurred.');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Delete Support Note
  const handleDeleteNote = async (noteId: string) => {
    showConfirm(
      'Confirm Deletion',
      'Are you sure you want to permanently delete this internal note?',
      async () => {
        setActionLoading(true);
        try {
          const { error } = await deleteSupportNote(supabase, noteId);
          if (error) throw error;

          // Reload notes for the selected ticket
          if (selectedTicket) {
            loadTicketNotes(selectedTicket.id);
          }
        } catch (err: any) {
          showAlert('Deletion Failed', err.message || 'An error occurred.');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Add Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedTicket || !profile) return;

    setNotePosting(true);
    try {
      const { error } = await createSupportNote(supabase, selectedTicket.id, profile.id, newNote);
      if (error) throw error;
      setNewNote('');
      loadTicketNotes(selectedTicket.id);
    } catch (err: any) {
      showAlert('Add Note Failed', err.message || 'An error occurred.');
    } finally {
      setNotePosting(false);
    }
  };

  // Generate WhatsApp Deep Link
  const getWhatsAppLink = (ticket: any) => {
    if (!ticket) return '';
    const name = ticket.clients?.full_name || ticket.name;
    const phone = ticket.clients?.phone || '';
    const ticketNo = ticket.ticket_number || '#0000';
    
    const prefilledText = `Hello ${name},\n\nYour support request (${ticketNo}) has been marked as resolved.\n\nIf the issue still exists, please contact the KANs HUB team.\n\nThank you.`;
    const cleanedPhone = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming Indian numbers standard 10 digit, prepend 91)
    const formattedPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(prefilledText)}`;
  };

  // Filter tickets by Status and Category
  const filteredTickets = tickets.filter((ticket) => {
    // 1. Status Filter
    if (activeTab === 'open' && ticket.status !== 'open') return false;
    if (activeTab === 'in_progress' && ticket.status !== 'in_progress') return false;
    if (activeTab === 'waiting' && ticket.status !== 'waiting_for_member') return false;
    if (activeTab === 'resolved' && ticket.status !== 'resolved') return false;

    // 2. Category Filter
    if (selectedCategoryFilter !== 'all' && ticket.category !== selectedCategoryFilter) return false;

    return true;
  });

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading support tickets queue..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionHeader
        title="Support Center"
        description="Verify Internet issues, vacate notices, and coordinate ticket resolution workflows."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-8 text-xs inline-flex items-center gap-1.5 font-sans"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-6 font-sans">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-4 text-xs font-semibold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`pb-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'open' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Open ({tickets.filter((t) => t.status === 'open').length})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`pb-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'in_progress' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            In Progress ({tickets.filter((t) => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setActiveTab('waiting')}
            className={`pb-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'waiting' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Waiting ({tickets.filter((t) => t.status === 'waiting_for_member').length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`pb-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'resolved' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Resolved ({tickets.filter((t) => t.status === 'resolved').length})
          </button>
        </div>

        {/* Category Filter */}
        <div className="relative w-full sm:w-48">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="suggestion">Suggestion</option>
            <option value="enquiry">Enquiry</option>
            <option value="complaint">Complaint</option>
            <option value="plan_change">Plan Change</option>
            <option value="vacate">Vacate Notice</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Ticket List View */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          title="No Tickets Found"
          description="There are currently no tickets logged matching your status or selected category."
          icon={LifeBuoy}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm border-collapse font-sans">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Ticket</th>
                <th className="p-4">Member</th>
                <th className="p-4">Seat</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Staff</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickets.map((ticket) => {
                const clientName = ticket.clients?.full_name || ticket.name;
                const staffAssigned = staffList.find((s) => s.id === ticket.assigned_to)?.fullName || 'Unassigned';

                return (
                  <tr key={ticket.id} className="hover:bg-muted/10">
                    <td className="p-4 font-mono font-bold text-primary select-all text-xs">
                      {ticket.ticket_number || '#0000'}
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {clientName}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                        {ticket.seat_number}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium text-foreground capitalize select-none">
                      {ticket.category.replace('_', ' ')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border ${
                          ticket.priority === 'high'
                            ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/40'
                            : ticket.priority === 'medium'
                            ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/40'
                            : 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800/20 dark:text-neutral-300 dark:border-neutral-700/40'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize border ${
                          ticket.status === 'open'
                            ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300'
                            : ticket.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
                            : ticket.status === 'waiting_for_member'
                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                        }`}
                      >
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {staffAssigned}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs inline-flex items-center gap-1.5"
                          onClick={() => handleOpenTicket(ticket)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Details</span>
                        </Button>
                        {profile?.role === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            disabled={actionLoading}
                            title="Delete Ticket"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== TICKET DETAIL DRAWER ==================== */}
      {selectedTicket && (() => {
        const clientName = selectedTicket.clients?.full_name || selectedTicket.name;
        const clientEmail = selectedTicket.clients?.email || selectedTicket.email;
        const clientPhone = selectedTicket.clients?.phone || 'Not Provided';
        const staffAssignedName = staffList.find((s) => s.id === selectedTicket.assigned_to)?.fullName;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedTicket(null)}
            />

            {/* Modal Body (Right Drawer Layout) */}
            <div className="relative w-full max-w-lg bg-background border-l border-border h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-slide-in">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <span>Ticket Review:</span>
                      <span className="font-mono text-primary select-all">{selectedTicket.ticket_number || '#0000'}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted on {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Member Profile Details Card */}
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Client Information
                  </span>
                  <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-2 text-xs text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-bold">{clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{clientEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{clientPhone}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Seat Allocation:</span>
                      </span>
                      <span className="font-bold text-foreground">{selectedTicket.seat_number}</span>
                    </div>
                  </div>
                </div>

                {/* Request Context Card */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      Request Details
                    </span>
                    <span className="text-xs font-semibold text-foreground capitalize select-none bg-muted px-2 py-0.5 rounded border border-border">
                      {selectedTicket.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border p-4 bg-muted/5 space-y-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1.5 select-none">Subject / Ticket Title:</span>
                      <p className="font-bold text-foreground">{selectedTicket.subject}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1.5 select-none">Description:</span>
                      <p className="text-muted-foreground leading-normal whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Uploaded Attachment preview */}
                    {selectedTicket.image_url && (
                      <div className="pt-3 border-t border-border/50">
                        <span className="text-muted-foreground block mb-2 select-none">Uploaded Image Proof:</span>
                        <a 
                          href={selectedTicket.image_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="group relative rounded-lg overflow-hidden border border-border bg-muted/20 p-1 block w-full max-w-sm hover:border-primary/50 transition-colors"
                        >
                          <img
                            src={selectedTicket.image_url}
                            alt="Attachment"
                            className="w-full h-32 object-cover rounded"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            <span>View Full Image</span>
                          </div>
                        </a>
                      </div>
                    )}

                    {selectedTicket.category === 'vacate' && (
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <span className="text-muted-foreground block select-none font-semibold">Expected Vacate Date:</span>
                        {profile?.role === 'admin' ? (
                          <input
                            type="date"
                            value={selectedTicket.expected_vacate_date ? selectedTicket.expected_vacate_date.split('T')[0] : ''}
                            onChange={async (e) => {
                              const newDate = e.target.value;
                              setSelectedTicket((prev: any) => ({ ...prev, expected_vacate_date: newDate }));
                              try {
                                const { error } = await supabase
                                  .from('support_requests')
                                  .update({ expected_vacate_date: newDate, updated_at: new Date().toISOString() })
                                  .eq('id', selectedTicket.id);
                                if (error) throw error;
                                loadData(true);
                              } catch (err: any) {
                                showAlert('Update Failed', err.message || 'An error occurred.');
                              }
                            }}
                            className="block w-full max-w-[180px] rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground cursor-pointer"
                          />
                        ) : (
                          <p className="font-bold text-foreground">
                            {selectedTicket.expected_vacate_date ? new Date(selectedTicket.expected_vacate_date).toLocaleDateString() : 'Not set'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Banner (if Resolved) */}
                {selectedTicket.status === 'resolved' && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3 text-xs">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 select-none">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ticket Resolved</span>
                    </h4>
                    <p className="text-muted-foreground leading-normal">
                      This ticket was marked as resolved on {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString() : '—'}.
                    </p>
                    
                    {/* WhatsApp Click-to-Chat button */}
                    <div className="pt-2 border-t border-emerald-500/10">
                      <a
                        href={getWhatsAppLink(selectedTicket)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-bold transition-colors cursor-pointer text-xs shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send WhatsApp Confirmation</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Staff Control Panel */}
                <div className="pt-4 border-t border-border space-y-4">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Staff Workflow Actions
                  </span>



                  {/* Status & Transitions */}
                  {selectedTicket.status !== 'resolved' && (
                    <div className="space-y-3">
                      {selectedTicket.category === 'vacate' ? (
                        <div className="pt-2">
                          <Button
                            type="button"
                            className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 font-bold"
                            disabled={actionLoading}
                            onClick={handleApproveVacate}
                          >
                            {actionLoading ? 'Approving Vacate...' : 'Approve Vacating Request'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label htmlFor="ticket-status" className="text-xs font-bold text-muted-foreground select-none">
                            Transition Status:
                          </label>
                          <select
                            id="ticket-status"
                            value={selectedTicket.status}
                            disabled={actionLoading}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                          >
                            <option value="open">Open / Backlog</option>
                            <option value="in_progress">In Progress</option>
                            <option value="waiting_for_member">Waiting for Member</option>
                            <option value="resolved">Mark Resolved</option>
                          </select>
                        </div>
                      )}

                      {/* Resolution Notes form if prompt triggered */}
                      {showResolutionForm && (
                        <div className="space-y-3 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-lg animate-slide-in">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider select-none">
                            Add Resolution Details
                          </h4>
                          <textarea
                            rows={3}
                            placeholder="Detail what was done to resolve the ticket (e.g. replaced router, finalized notice date)..."
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            className="block w-full px-3 py-2 bg-background border border-input rounded-md text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none leading-normal font-sans"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => setShowResolutionForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
                              disabled={actionLoading || !resolutionNote.trim()}
                              onClick={handleResolveTicket}
                            >
                              Confirm Resolution
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline and Internal Notes */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Timeline &amp; Internal Notes</span>
                  </div>

                  {/* Notes Feed */}
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {notes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center select-none py-2">
                        No internal notes logged on this ticket yet.
                      </p>
                    ) : (
                      notes.map((note) => {
                        const isResolution = note.note.startsWith('[RESOLUTION NOTES]');
                        return (
                          <div 
                            key={note.id} 
                            className={`p-3 rounded-lg border text-xs space-y-1 ${
                              isResolution 
                                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-800 dark:text-emerald-400' 
                                : 'bg-muted/30 border-border text-foreground'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                              <span>{note.author?.full_name || 'System'}</span>
                              <div className="flex items-center gap-2">
                                <span>{new Date(note.created_at).toLocaleString()}</span>
                                {profile && note.author_id === profile.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(note.id)}
                                    disabled={actionLoading}
                                    className="text-rose-500 hover:text-rose-700 p-0.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center justify-center"
                                    title="Delete Note"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="leading-normal whitespace-pre-wrap">{note.note}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Note Input */}
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add internal note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="block flex-1 px-3 py-1.5 bg-background border border-input rounded-md text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                      type="submit"
                      disabled={notePosting || !newNote.trim()}
                      className="h-8 w-8 rounded-md flex items-center justify-center p-0 shrink-0 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </div>

              {/* Close Drawer button */}
              <div className="border-t border-border pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs font-semibold"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

    </PageContainer>
  );
}

export default function SupportDashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SupportDashboardContent />
    </Suspense>
  );
}
