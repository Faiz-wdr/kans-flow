'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/shared/shell/PageContainer';
import { SectionHeader } from '@/components/shared/shell/SectionHeader';
import { EmptyState } from '@/components/shared/shell/EmptyState';
import { LoadingState } from '@/components/shared/shell/LoadingState';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getOnboardingRequests, approveOnboardingRequest, rejectOnboardingRequest, updateOnboardingRequest } from '@/services/db/onboarding';
import { getClients } from '@/services/db/clients';
import { getSeats } from '@/services/db/seats';
import { useDialog } from '@/providers/dialog-provider';
import { useProfile } from '@/providers/profile-provider';
import { dashboardCache } from '@/lib/cache/dashboard-cache';
import type { Client, OnboardingRequest, Seat, StaffProfile } from '@/types';
import {
  Users,
  FileText,
  UserCheck,
  Check,
  X,
  MapPin,
  Phone,
  Briefcase,
  GraduationCap,
  Calendar,
  AlertCircle,
  Eye,
  Shield,
  Loader2,
  RotateCw,
  Filter,
} from 'lucide-react';

export default function ClientsDashboardPage() {
  const profile = useProfile();
  const cached = dashboardCache.get<{
    clients: Client[];
    onboardingRequests: OnboardingRequest[];
    allSeats: Seat[];
    availableSeats: Seat[];
  }>('clients_data');

  const [activeTab, setActiveTab] = useState<'active' | 'onboarding' | 'vacating' | 'archived'>('active');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'Coworking' | 'Virtual Office'>('all');
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [clients, setClients] = useState<Client[]>(cached?.clients || []);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>(cached?.onboardingRequests || []);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>(cached?.availableSeats || []);
  const [allSeats, setAllSeats] = useState<Seat[]>(cached?.allSeats || []);

  // Selected request for review modal
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [activeRequest, setActiveRequest] = useState<OnboardingRequest | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');

  // Onboarding Checklist state
  const [checklist, setChecklist] = useState({
    securityDeposit: false,
    firstMonthRent: false,
    accessCard: false,
    whatsappGroup: false,
    agreementCopy: false,
    switchesExplained: false,
  });
  const [editedStartDate, setEditedStartDate] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Edit states for review modal drawer
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPurposeType, setEditPurposeType] = useState<'Student' | 'Working'>('Student');
  const [editPurposeDetails, setEditPurposeDetails] = useState('');

  const { showAlert, showConfirm } = useDialog();

  const supabase = createClient();

  // Load data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!cached && clients.length === 0) {
      setLoading(true);
    }
    try {
      if (profile?.organizationId) {
        // Run database queries concurrently
        const [clientsRes, onboardingRes, seatsRes] = await Promise.all([
          getClients(supabase, profile.organizationId),
          getOnboardingRequests(supabase),
          getSeats(supabase, profile.organizationId)
        ]);

        const clientsData = clientsRes.data || [];
        const onboardingData = onboardingRes.data || [];
        const seatsData = seatsRes.data || [];
        const freeSeats = seatsData.filter((s) => s.status === 'available');

        setClients(clientsData);
        setOnboardingRequests(onboardingData);
        setAllSeats(seatsData);
        setAvailableSeats(freeSeats);

        // Update cache
        dashboardCache.set('clients_data', {
          clients: clientsData,
          onboardingRequests: onboardingData,
          allSeats: seatsData,
          availableSeats: freeSeats,
        });
      }
    } catch (err) {
      console.error('Error loading clients dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.organizationId]);

  useEffect(() => {
    if (selectedRequest) {
      setActiveRequest(selectedRequest);
      const reqDetails = parseRequestNotes(selectedRequest.notes);
      setSelectedSeatId(reqDetails.selectedSeatId || '');
      setChecklist(reqDetails.checklist || {
        securityDeposit: false,
        firstMonthRent: false,
        accessCard: false,
        whatsappGroup: false,
        agreementCopy: false,
        switchesExplained: false,
      });
    }
  }, [selectedRequest]);

  // Filter clients by tab and service
  const rawActiveClients = clients.filter((c) => c.status === 'active');
  const rawVacatingClients = clients.filter((c) => c.status === 'vacating');
  const rawArchivedClients = clients.filter((c) => c.status === 'archived');
  const rawPendingRequests = onboardingRequests.filter((r) => r.status === 'pending');

  const filterByService = <T extends { service?: string; email: string }>(items: T[]) => {
    return items.filter((item) => {
      const s = item.service || onboardingRequests.find((r) => r.email === item.email)?.service || 'Coworking';
      if (serviceFilter === 'all') return true;
      if (serviceFilter === 'Virtual Office') return s === 'Virtual Office';
      if (serviceFilter === 'Coworking') return s !== 'Virtual Office';
      return true;
    });
  };

  const activeClients = filterByService(rawActiveClients);
  const vacatingClients = filterByService(rawVacatingClients);
  const archivedClients = filterByService(rawArchivedClients);
  const pendingRequestsCount = rawPendingRequests.length;
  const pendingRequests = filterByService(rawPendingRequests);

  // Helper to parse notes JSON payload
  const parseRequestNotes = (notes: string | null) => {
    let details: Record<string, any> = {
      emergencyContact: 'Not Provided',
      address: 'Not Provided',
      idProofType: 'Aadhar',
      idProofUrl: '',
      purposeType: 'Student',
      purposeDetails: 'General Desk Use',
      userNotes: '',
      selectedSeatId: '',
      checklist: {
        securityDeposit: false,
        firstMonthRent: false,
        accessCard: false,
        whatsappGroup: false,
        agreementCopy: false,
        switchesExplained: false,
      }
    };

    if (!notes) return details;

    try {
      const parsed = JSON.parse(notes);
      return {
        ...details,
        ...parsed,
        emergencyContact: parsed.emergencyContact || details.emergencyContact,
        address: parsed.address || details.address,
        idProofType: parsed.idProofType || details.idProofType,
        idProofUrl: parsed.idProofUrl || details.idProofUrl,
        purposeType: parsed.purposeType || details.purposeType,
        purposeDetails: parsed.purposeDetails || details.purposeDetails,
        userNotes: parsed.userNotes || '',
        selectedSeatId: parsed.selectedSeatId || '',
        checklist: {
          securityDeposit: parsed.checklist?.securityDeposit || false,
          firstMonthRent: parsed.checklist?.firstMonthRent || false,
          accessCard: parsed.checklist?.accessCard || false,
          whatsappGroup: parsed.checklist?.whatsappGroup || false,
          agreementCopy: parsed.checklist?.agreementCopy || false,
          switchesExplained: parsed.checklist?.switchesExplained || false,
        }
      };
    } catch (e) {
      // Return notes as userNotes if not JSON formatted
      return { ...details, userNotes: notes };
    }
  };

  // Wrapper to verify checklist before final approval
  const handleApproveWithChecklistCheck = () => {
    if (!selectedRequest || !profile) return;
    if (selectedRequest.service !== 'Virtual Office' && !selectedSeatId) return;

    if (selectedRequest.service === 'Virtual Office') {
      handleApprove();
      return;
    }

    const uncheckedItems: string[] = [];
    if (!checklist.securityDeposit) uncheckedItems.push('Security Deposit Received ₹1500');
    if (!checklist.firstMonthRent) uncheckedItems.push('1st Month Rent Received');
    if (!checklist.accessCard) uncheckedItems.push('Access Card Given');
    if (!checklist.whatsappGroup) uncheckedItems.push('Added to KH WhatsApp Group');
    if (!checklist.agreementCopy) uncheckedItems.push('Agreement copy/photo given to Member');
    if (!checklist.switchesExplained) uncheckedItems.push('Switches Explained');

    if (uncheckedItems.length > 0) {
      const warningMessage = `The following checklist items are NOT checked:\n\n` +
        uncheckedItems.map(item => `• ${item}`).join('\n') +
        `\n\nDo you want to proceed with approval anyway?`;

      showConfirm(
        'Approve Without Checklist?',
        warningMessage,
        handleApprove,
        undefined,
        'Approve',
        'Cancel'
      );
    } else {
      handleApprove();
    }
  };

  // Handle Onboarding Approval
  const handleApprove = async () => {
    if (!selectedRequest || !profile) return;
    if (selectedRequest.service !== 'Virtual Office' && !selectedSeatId) return;

    setActionLoading(true);
    try {
      const isVO = selectedRequest.service === 'Virtual Office';
      const parsedNotes = parseRequestNotes(selectedRequest.notes);

      const requestPayload = {
        ...selectedRequest,
        fullName: editFullName || selectedRequest.fullName,
        email: editEmail || selectedRequest.email,
        phone: editPhone || selectedRequest.phone,
        startDate: editedStartDate || selectedRequest.startDate,
        notes: isVO ? selectedRequest.notes : JSON.stringify({
          emergencyContact: editEmergencyContact,
          address: editAddress,
          idProofType: parsedNotes.idProofType,
          idProofUrl: parsedNotes.idProofUrl,
          purposeType: editPurposeType,
          purposeDetails: editPurposeDetails,
          userNotes: parsedNotes.userNotes,
          selectedSeatId,
          checklist,
        }),
      };

      const { error } = await approveOnboardingRequest(supabase, requestPayload, selectedSeatId, profile.id);
      if (error) throw error;
      showAlert('Approval Successful', isVO ? 'Virtual Office application approved successfully!' : 'Membership application approved successfully! Seat assigned.');
      setSelectedRequest(null);
      setSelectedSeatId('');
      setEditedStartDate('');
      loadData();

      // Dispatch custom event to notify sidebar to update count
      window.dispatchEvent(new CustomEvent('onboarding-requests-updated'));
    } catch (err: any) {
      showAlert('Approval Failed', err.message || 'Verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle saving changes without approval
  const handleSaveChanges = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const serializedNotes = JSON.stringify({
        emergencyContact: editEmergencyContact,
        address: editAddress,
        idProofType: parseRequestNotes(selectedRequest.notes).idProofType,
        idProofUrl: parseRequestNotes(selectedRequest.notes).idProofUrl,
        purposeType: editPurposeType,
        purposeDetails: editPurposeDetails,
        userNotes: parseRequestNotes(selectedRequest.notes).userNotes,
        selectedSeatId,
        checklist,
      });

      const { error } = await updateOnboardingRequest(supabase, selectedRequest.id, {
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
        startDate: editedStartDate,
        notes: serializedNotes,
      });

      if (error) throw error;
      showAlert('Save Successful', 'Membership details updated successfully.');
      loadData();

      // Update selectedRequest details locally
      setSelectedRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          fullName: editFullName,
          email: editEmail,
          phone: editPhone,
          startDate: editedStartDate,
          notes: serializedNotes,
        };
      });
    } catch (err: any) {
      showAlert('Save Failed', err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Onboarding Rejection (Delete request permanently)
  const handleReject = async () => {
    if (!selectedRequest || !profile) return;

    const confirmMessage = `Are you sure you want to permanently delete the membership onboarding request for ${selectedRequest.fullName}? This action cannot be undone and will delete the record permanently.`;
    showConfirm('Confirm Rejection', confirmMessage, async () => {
      setActionLoading(true);
      try {
        const { error } = await rejectOnboardingRequest(supabase, selectedRequest.id, profile.id);
        if (error) throw error;
        showAlert('Rejection Successful', 'Membership onboarding request deleted permanently.');
        setSelectedRequest(null);
        loadData();

        // Dispatch custom event to notify sidebar to update count
        window.dispatchEvent(new CustomEvent('onboarding-requests-updated'));
      } catch (err: any) {
        showAlert('Deletion Failed', err.message || 'An error occurred.');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleViewClientDetails = (client: Client) => {
    const req = onboardingRequests.find((r) => r.email === client.email);
    if (req) {
      setSelectedRequest(req);
      setSelectedSeatId('');
      setEditedStartDate(req.startDate || '');

      // Initialize edit states
      setEditFullName(req.fullName || '');
      setEditEmail(req.email || '');
      setEditPhone(req.phone || '');

      const details = parseRequestNotes(req.notes);
      setEditEmergencyContact(details.emergencyContact || '');
      setEditAddress(details.address || '');
      setEditPurposeType(details.purposeType === 'Working' ? 'Working' : 'Student');
      setEditPurposeDetails(details.purposeDetails || '');
    } else {
      showAlert('No Onboarding Details', 'No onboarding request details found for this member.');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading client registry and request queue..." />
      </PageContainer>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <PageContainer>
      <SectionHeader
        title="Client Registry"
        description="Search active workspace members, review onboarding requests, and coordinate vacate checklist returns."
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

      {/* Navigation tabs & Service Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-2">
        <div className="flex gap-6 text-sm font-sans overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-1 font-medium cursor-pointer transition-colors ${activeTab === 'active'
              ? 'border-b-2 border-primary text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Active Members ({activeClients.length})
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`pb-1 font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${activeTab === 'onboarding'
              ? 'border-b-2 border-primary text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Onboarding Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('vacating')}
            className={`pb-1 font-medium cursor-pointer transition-colors ${activeTab === 'vacating'
              ? 'border-b-2 border-primary text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Vacating Clients ({vacatingClients.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-1 font-medium cursor-pointer transition-colors ${activeTab === 'archived'
              ? 'border-b-2 border-primary text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Archived History ({archivedClients.length})
          </button>
        </div>

        {/* Service Filter Options */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs font-sans self-start sm:self-auto shrink-0">
          {/* <span className="text-muted-foreground font-semibold px-2 flex items-center gap-1 select-none">
            <Filter className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Service:</span>
          </span> */}
          <button
            onClick={() => setServiceFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${serviceFilter === 'all'
                ? 'bg-background text-foreground shadow-xs border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setServiceFilter('Coworking')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${serviceFilter === 'Coworking'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Coworking
          </button>
          <button
            onClick={() => setServiceFilter('Virtual Office')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${serviceFilter === 'Virtual Office'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Virtual Office
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeClients.length === 0 ? (
            <EmptyState
              title="No Active Members"
              description="There are currently no active memberships checked into workspace desks."
              icon={Users}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Name</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Onboarded At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeClients.map((client) => {
                    const s = client.service || onboardingRequests.find((r) => r.email === client.email)?.service || 'Coworking';
                    const isVO = s === 'Virtual Office';
                    return (
                      <tr key={client.id} className="hover:bg-muted/10">
                        <td className="p-4 font-semibold text-foreground">{client.fullName}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${isVO
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            }`}>
                            {s}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{client.email}</td>
                        <td className="p-4 text-muted-foreground">{client.phone}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {client.onboardedAt ? new Date(client.onboardedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs inline-flex items-center gap-1.5"
                              onClick={() => handleViewClientDetails(client)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <EmptyState
              title="Queue is Empty"
              description="No pending membership onboarding applications have been submitted yet."
              icon={FileText}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Applicant / Company</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Plan / Details</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Allocation / Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingRequests.map((req) => {
                    const details = parseRequestNotes(req.notes);
                    const allocatedSeat = allSeats.find((s) => s.id === details.selectedSeatId);
                    const isVO = req.service === 'Virtual Office';

                    return (
                      <tr key={req.id} className="hover:bg-muted/10">
                        <td className="p-4">
                          <p className="font-semibold text-foreground">{req.fullName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{req.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${isVO
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            }`}>
                            {req.service || 'Coworking'}
                          </span>
                        </td>
                        <td className="p-4">
                          {isVO ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${details.plan === 'Gold'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300'
                                  : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300'
                                }`}>
                                {details.plan || 'Silver'} Plan
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-xs">{details.purposeType}</span>
                              <span className="text-xs text-muted-foreground mt-0.5 max-w-[150px] truncate" title={details.purposeDetails}>
                                {details.purposeDetails}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(req.startDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {isVO ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Digital Address
                            </span>
                          ) : allocatedSeat ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {allocatedSeat.name} ({allocatedSeat.type === 'coworking' ? 'Coworking' : allocatedSeat.type === 'study' ? 'Study' : 'Cabin'})
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Not Allocated
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs inline-flex items-center gap-1.5"
                              onClick={() => {
                                setSelectedRequest(req);
                                setSelectedSeatId('');
                                setEditedStartDate(req.startDate || '');

                                // Initialize edit states
                                setEditFullName(req.fullName || '');
                                setEditEmail(req.email || '');
                                setEditPhone(req.phone || '');

                                const reqDetails = parseRequestNotes(req.notes);
                                setEditEmergencyContact(reqDetails.emergencyContact || '');
                                setEditAddress(reqDetails.address || '');
                                setEditPurposeType(reqDetails.purposeType === 'Working' ? 'Working' : 'Student');
                                setEditPurposeDetails(reqDetails.purposeDetails || '');
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{req.status === 'pending' ? 'Review' : 'View'}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vacating' && (
        <div className="space-y-4">
          {vacatingClients.length === 0 ? (
            <EmptyState
              title="No Pending Vacate Actions"
              description="There are currently no active members scheduled to vacate their workspaces."
              icon={Users}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Name</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vacatingClients.map((client) => {
                    const s = client.service || onboardingRequests.find((r) => r.email === client.email)?.service || 'Coworking';
                    const isVO = s === 'Virtual Office';
                    return (
                      <tr key={client.id} className="hover:bg-muted/10">
                        <td className="p-4 font-semibold text-foreground">{client.fullName}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${isVO
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            }`}>
                            {s}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{client.email}</td>
                        <td className="p-4 text-muted-foreground">{client.phone}</td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs inline-flex items-center gap-1.5"
                              onClick={() => handleViewClientDetails(client)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'archived' && (
        <div className="space-y-4">
          {archivedClients.length === 0 ? (
            <EmptyState
              title="No Archived Records"
              description="Historical records of past members will be logged here."
              icon={Users}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Name</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {archivedClients.map((client) => {
                    const s = client.service || onboardingRequests.find((r) => r.email === client.email)?.service || 'Coworking';
                    const isVO = s === 'Virtual Office';
                    return (
                      <tr key={client.id} className="hover:bg-muted/10">
                        <td className="p-4 font-semibold text-foreground">{client.fullName}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${isVO
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            }`}>
                            {s}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{client.email}</td>
                        <td className="p-4 text-muted-foreground">{client.phone}</td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs inline-flex items-center gap-1.5"
                              onClick={() => handleViewClientDetails(client)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}      {/* ----------------- ADMIN REVIEW MODAL OVERLAY ----------------- */}
      {activeRequest && (() => {
        const details = parseRequestNotes(activeRequest.notes);
        const isPending = activeRequest.status === 'pending';
        const isOpen = !!selectedRequest;

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-end font-sans transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setSelectedRequest(null)}
            />

            {/* Modal Body (Right Drawer Layout) */}
            <div className={`relative w-full max-w-md bg-background border-l border-border h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {activeRequest.service === 'Virtual Office' ? 'Virtual Office Request Review' : 'Membership Request Review'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(activeRequest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Seat / Service Allocation Banner */}
                {isPending && (
                  activeRequest.service === 'Virtual Office' ? (
                    <div className="space-y-1 bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-lg text-xs">
                      <p className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>Virtual Office Business Address Lease</span>
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        No physical desk allocation required. Approving provisions digital client record.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-primary/5 border border-primary/10 p-4 rounded-lg">
                      <label htmlFor="assign-seat" className="block text-xs font-bold text-foreground uppercase tracking-wider">
                        Assign Workspace Desk/Seat
                      </label>
                      <select
                        id="assign-seat"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-medium"
                        value={selectedSeatId}
                        onChange={(e) => setSelectedSeatId(e.target.value)}
                      >
                        <option value="">Select an available desk...</option>
                        {availableSeats.map((seat) => (
                          <option key={seat.id} value={seat.id}>
                            {seat.name} ({seat.type === 'coworking' ? 'Coworking' : seat.type === 'study' ? 'Study Desk' : 'Cabin'})
                          </option>
                        ))}
                        {selectedSeatId && !availableSeats.some((s) => s.id === selectedSeatId) && (() => {
                          const savedSeat = allSeats.find((s) => s.id === selectedSeatId);
                          if (savedSeat) {
                            return (
                              <option key={savedSeat.id} value={savedSeat.id}>
                                {savedSeat.name} ({savedSeat.type === 'coworking' ? 'Coworking' : savedSeat.type === 'study' ? 'Study Desk' : 'Cabin'}) (Saved)
                              </option>
                            );
                          }
                          return null;
                        })()}
                        {availableSeats.length === 0 && !selectedSeatId && (
                          <option disabled value="">
                            No available desks in workspace!
                          </option>
                        )}
                      </select>
                      {!selectedSeatId && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium animate-pulse">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Please select a seat to enable application approval.</span>
                        </p>
                      )}
                    </div>
                  )
                )}

                {/* Main Details View */}
                {activeRequest.service === 'Virtual Office' ? (
                  <div className="space-y-4 text-xs font-sans">
                    {/* Company Profile */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Company Profile & Plan
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Company Name:</span>
                          <span className="font-bold text-foreground">{details.companyName || activeRequest.fullName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Selected Plan:</span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {details.plan || 'Silver'} Plan
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Nature of Business:</span>
                          <span className="font-medium text-foreground">{details.natureOfBusiness === 'Other' ? details.natureOfBusinessOther : details.natureOfBusiness}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Primary Email:</span>
                          <span className="font-mono">{details.email1 || activeRequest.email}</span>
                        </div>
                        {details.email2 && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-semibold">Secondary Email:</span>
                            <span className="font-mono">{details.email2}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo & Tax Compliance */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Tax & Compliance Details
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">GSTIN:</span>
                          <span className="font-mono font-bold">{details.gstin || 'Not Provided'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Required Stamp Paper:</span>
                          <span className="font-bold text-primary">{details.stampPaper || '₹100'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Reason for VO:</span>
                          <span className="font-medium">{details.reasonForVo === 'Other' ? details.reasonForVoOther : details.reasonForVo}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Consultant Handling:</span>
                          <span className="font-medium">{details.consultantHandling}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Tentative Target Date:</span>
                          <span className="font-medium">{details.tentativeCompletionDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logo Preview */}
                    {details.companyLogoUrl && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Company Logo Attachment
                        </h4>
                        <div className="rounded-lg border border-border p-2 bg-muted/10 flex items-center justify-center">
                          <img src={details.companyLogoUrl} alt="Company Logo" className="max-h-24 object-contain rounded" />
                        </div>
                      </div>
                    )}

                    {/* Challenges & Context */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Operational Context & Challenges
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Biggest Prior Challenge:</span>
                          <p className="bg-background p-2 rounded border border-border text-muted-foreground italic leading-normal">
                            "{details.biggestChallenge || 'N/A'}"
                          </p>
                        </div>
                        <div className="pt-2">
                          <span className="text-muted-foreground font-semibold block mb-0.5">Current Problem Being Solved:</span>
                          <p className="bg-background p-2 rounded border border-border text-muted-foreground italic leading-normal">
                            "{details.currentProblem || 'N/A'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Applicant Details
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-3.5 text-xs text-foreground">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="edit-full-name" className="text-muted-foreground font-semibold">Full Name:</label>
                          {isPending ? (
                            <input
                              id="edit-full-name"
                              type="text"
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                            />
                          ) : (
                            <span className="font-semibold">{activeRequest.fullName}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="edit-email" className="text-muted-foreground font-semibold">Email Address:</label>
                          {isPending ? (
                            <input
                              id="edit-email"
                              type="email"
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          ) : (
                            <span>{activeRequest.email}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="edit-phone" className="text-muted-foreground font-semibold flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>Phone Number:</span>
                          </label>
                          {isPending ? (
                            <input
                              id="edit-phone"
                              type="tel"
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                            />
                          ) : (
                            <span>{activeRequest.phone}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="edit-emergency" className="text-muted-foreground font-semibold flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Emergency Contact Number:</span>
                          </label>
                          {isPending ? (
                            <input
                              id="edit-emergency"
                              type="tel"
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                              value={editEmergencyContact}
                              onChange={(e) => setEditEmergencyContact(e.target.value)}
                            />
                          ) : (
                            <span>{details.emergencyContact}</span>
                          )}
                        </div>
                        <div className="pt-2 border-t border-border/50 flex flex-col gap-1">
                          <label htmlFor="edit-address" className="text-muted-foreground font-semibold flex items-center gap-1 select-none">
                            <MapPin className="h-3 w-3" />
                            <span>Residential Address:</span>
                          </label>
                          {isPending ? (
                            <textarea
                              id="edit-address"
                              rows={2}
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold resize-none"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                            />
                          ) : (
                            <p className="text-[11px] text-muted-foreground leading-normal">{details.address}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Purpose Section */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Purpose of Workspace Lease
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 text-xs space-y-3">
                        {isPending ? (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="edit-purpose-type" className="text-muted-foreground font-semibold">Purpose Type:</label>
                              <select
                                id="edit-purpose-type"
                                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                                value={editPurposeType}
                                onChange={(e) => setEditPurposeType(e.target.value as 'Student' | 'Working')}
                              >
                                <option value="Student">Student</option>
                                <option value="Working">Working</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="edit-purpose-details" className="text-muted-foreground font-semibold">
                                {editPurposeType === 'Student' ? 'Course / Exam Preparing For:' : 'Job Title / Nature of Work:'}
                              </label>
                              <input
                                id="edit-purpose-details"
                                type="text"
                                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                                value={editPurposeDetails}
                                onChange={(e) => setEditPurposeDetails(e.target.value)}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              {details.purposeType === 'Student' ? (
                                <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <GraduationCap className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <Briefcase className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-foreground">{details.purposeType}</p>
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Details:</span> {details.purposeDetails}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Joining Timeline & Notes */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Joining Timeline &amp; Notes
                      </h4>
                      <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-3 text-xs">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="edit-joining-date" className="text-muted-foreground font-semibold flex items-center gap-1 select-none">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Target Joining Date:</span>
                          </label>
                          {isPending ? (
                            <input
                              id="edit-joining-date"
                              type="date"
                              className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground font-semibold"
                              value={editedStartDate}
                              onChange={(e) => setEditedStartDate(e.target.value)}
                            />
                          ) : (
                            <span className="font-semibold text-foreground bg-muted/10 border border-border px-3 py-1.5 rounded-md block">
                              {new Date(activeRequest.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {details.userNotes && (
                          <div className="pt-2 border-t border-border/50">
                            <span className="text-muted-foreground block mb-1">User Notes:</span>
                            <p className="text-[11px] bg-background border border-border p-2 rounded text-muted-foreground italic leading-normal">
                              "{details.userNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ID Verification Document */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Uploaded Verification Document
                      </h4>
                      <div className="rounded-lg border border-border p-3 bg-muted/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{details.idProofType} Card</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Application Attachment</p>
                          </div>
                        </div>
                        {details.idProofUrl ? (
                          <a
                            href={details.idProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View Document
                          </a>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-semibold">No Document URL Found</span>
                        )}
                      </div>

                      {/* ID Preview Image Box */}
                      {details.idProofUrl && !details.idProofUrl.endsWith('.pdf') && (
                        <div className="mt-2.5 rounded-lg overflow-hidden border border-border bg-muted/20 p-1">
                          <img
                            src={details.idProofUrl}
                            alt="ID Proof Doc"
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    {/* Onboarding Checklist */}
                    {isPending && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
                          Onboarding Checklist
                        </h4>
                        <div className="rounded-lg border border-border p-3.5 bg-muted/5 space-y-2 text-xs">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.securityDeposit}
                              onChange={(e) => setChecklist(prev => ({ ...prev, securityDeposit: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">Security Deposit Received ₹1500</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.firstMonthRent}
                              onChange={(e) => setChecklist(prev => ({ ...prev, firstMonthRent: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">1st Month Rent Received</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.accessCard}
                              onChange={(e) => setChecklist(prev => ({ ...prev, accessCard: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">Access Card Given</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.whatsappGroup}
                              onChange={(e) => setChecklist(prev => ({ ...prev, whatsappGroup: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">Added to KH WhatsApp Group</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.agreementCopy}
                              onChange={(e) => setChecklist(prev => ({ ...prev, agreementCopy: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">Agreement copy/photo given to Member</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={checklist.switchesExplained}
                              onChange={(e) => setChecklist(prev => ({ ...prev, switchesExplained: e.target.checked }))}
                              className="h-4 w-4 rounded border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                            />
                            <span className="text-foreground">Switches Explained</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Panel */}
              <div className="border-t border-border pt-4 mt-6 space-y-3.5">
                {isPending ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs font-semibold"
                      disabled={actionLoading}
                      onClick={handleSaveChanges}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        className="text-xs"
                        disabled={actionLoading}
                        onClick={handleReject}
                      >
                        Reject Request
                      </Button>
                      <Button
                        type="button"
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
                        disabled={(activeRequest.service !== 'Virtual Office' && !selectedSeatId) || actionLoading}
                        onClick={handleApproveWithChecklistCheck}
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            <span>{activeRequest.service === 'Virtual Office' ? 'Approve Application' : 'Approve & Assign'}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground text-center border border-border">
                    This request has already been reviewed and marked as{' '}
                    <span className="font-bold text-foreground capitalize">{activeRequest.status}</span>.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </PageContainer>
  );
}
