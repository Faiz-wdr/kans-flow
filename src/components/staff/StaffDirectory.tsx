'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StaffProfile, Sector, UserRole } from '@/types';
import {
  Search,
  Filter,
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  Eye,
  Shield,
  Briefcase,
  Layers,
  Phone,
  Mail,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createStaffAction,
  updateStaffAction,
  resetStaffPasswordAction,
  deleteStaffAction,
  toggleStaffStatusAction,
  fetchStaffProfilesAction,
} from '@/app/(dashboard)/dashboard/staff/actions';

interface StaffDirectoryProps {
  initialStaff: StaffProfile[];
  sectors: Sector[];
}

export function StaffDirectory({ initialStaff, sectors }: StaffDirectoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filters State
  const [staff, setStaff] = useState<StaffProfile[]>(initialStaff);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected item states
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);

  // Form states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Temporary password display state
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string; pass: string } | null>(null);

  // Helper to re-fetch profiles based on filters
  const refreshProfiles = async (currentSearch = search, currentRole = roleFilter, currentStatus = statusFilter, currentSector = sectorFilter) => {
    const res = await fetchStaffProfilesAction({
      search: currentSearch,
      role: currentRole,
      status: currentStatus,
      sectorId: currentSector,
    });
    if (res.success && res.data) {
      setStaff(res.data);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    startTransition(() => {
      refreshProfiles(value, roleFilter, statusFilter, sectorFilter);
    });
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRoleFilter(value);
    startTransition(() => {
      refreshProfiles(search, value, statusFilter, sectorFilter);
    });
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    startTransition(() => {
      refreshProfiles(search, roleFilter, value, sectorFilter);
    });
  };

  const handleSectorFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSectorFilter(value);
    startTransition(() => {
      refreshProfiles(search, roleFilter, statusFilter, value);
    });
  };

  // ----------------------------------------------------
  // Add Staff Handler
  // ----------------------------------------------------
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setGeneratedCreds(null);
    setFormSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const mobileNumber = formData.get('mobileNumber') as string;
    const employeeId = formData.get('employeeId') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const role = formData.get('role') as UserRole;
    const tempPassword = formData.get('tempPassword') as string;
    const selectedSectors = formData.getAll('sectorIds') as string[];

    if (!fullName || !email || !role || !tempPassword) {
      setErrorMsg('Full Name, Email, Role, and Temporary Password are required.');
      setFormSubmitting(false);
      return;
    }

    const res = await createStaffAction({
      fullName,
      email,
      mobileNumber: mobileNumber || undefined,
      employeeId: employeeId || undefined,
      jobTitle: jobTitle || undefined,
      role,
      sectorIds: selectedSectors,
      temporaryPassword: tempPassword,
    });

    if (res.success) {
      setSuccessMsg('Staff member added successfully!');
      setGeneratedCreds({ email, pass: tempPassword });
      refreshProfiles();
    } else {
      setErrorMsg(res.error || 'Failed to create staff member.');
    }
    setFormSubmitting(false);
  };

  // ----------------------------------------------------
  // Edit Staff Handler
  // ----------------------------------------------------
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const mobileNumber = formData.get('mobileNumber') as string;
    const employeeId = formData.get('employeeId') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const role = formData.get('role') as UserRole;
    const notes = formData.get('notes') as string;
    const isActive = formData.get('isActive') === 'true';
    const selectedSectors = formData.getAll('sectorIds') as string[];

    if (!fullName || !email || !role) {
      setErrorMsg('Full Name, Email, and Role are required.');
      setFormSubmitting(false);
      return;
    }

    const res = await updateStaffAction(selectedStaff.id, {
      fullName,
      email,
      mobileNumber: mobileNumber || undefined,
      employeeId: employeeId || undefined,
      jobTitle: jobTitle || undefined,
      role,
      sectorIds: selectedSectors,
      isActive,
      notes: notes || undefined,
    });

    if (res.success) {
      setSuccessMsg('Staff details updated successfully.');
      setIsEditOpen(false);
      refreshProfiles();
    } else {
      setErrorMsg(res.error || 'Failed to update staff member.');
    }
    setFormSubmitting(false);
  };

  // ----------------------------------------------------
  // Reset Password Handler
  // ----------------------------------------------------
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('newPassword') as string;

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setFormSubmitting(false);
      return;
    }

    const res = await resetStaffPasswordAction(selectedStaff.id, password);
    if (res.success) {
      setSuccessMsg('Password has been successfully updated.');
      setIsPasswordOpen(false);
    } else {
      setErrorMsg(res.error || 'Failed to reset password.');
    }
    setFormSubmitting(false);
  };

  // ----------------------------------------------------
  // Delete Staff Handler
  // ----------------------------------------------------
  const handleDeleteSubmit = async () => {
    if (!selectedStaff) return;
    setErrorMsg(null);
    setFormSubmitting(true);

    const res = await deleteStaffAction(selectedStaff.id);
    if (res.success) {
      setIsDeleteOpen(false);
      refreshProfiles();
    } else {
      setErrorMsg(res.error || 'Failed to delete staff member.');
    }
    setFormSubmitting(false);
  };

  // Toggle active status directly
  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    const res = await toggleStaffStatusAction(staffId, !currentStatus);
    if (res.success) {
      refreshProfiles();
    } else {
      alert(res.error || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Layout */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, job title or employee ID..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Sector Filter */}
          <div className="flex items-center gap-1 bg-card/50 border border-border rounded-lg px-2 text-xs">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <select
              value={sectorFilter}
              onChange={handleSectorFilterChange}
              className="py-1.5 bg-transparent border-0 outline-none text-foreground cursor-pointer font-sans"
            >
              <option value="all">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-card/50 border border-border rounded-lg px-2 text-xs">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="py-1.5 bg-transparent border-0 outline-none text-foreground cursor-pointer font-sans"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-card/50 border border-border rounded-lg px-2 text-xs">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="py-1.5 bg-transparent border-0 outline-none text-foreground cursor-pointer font-sans"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Add Staff Button */}
          <Button
            onClick={() => {
              setErrorMsg(null);
              setSuccessMsg(null);
              setGeneratedCreds(null);
              setIsAddOpen(true);
            }}
            className="text-xs"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Directory Content List */}
      {isPending ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : staff.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-16 text-center bg-card/20">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-base font-bold text-foreground font-sans">No staff members found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria, selecting a different filter, or provision a new staff operator account.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/30 border-b border-border text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Sectors</th>
                  <th className="py-3.5 px-4">Job Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {staff.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground font-sans">{p.fullName}</p>
                          {p.employeeId && (
                            <p className="text-[10px] text-muted-foreground">ID: {p.employeeId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
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
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.sectors && p.sectors.length > 0 ? (
                          p.sectors.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground border border-border"
                            >
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-muted-foreground">{p.jobTitle || 'Operator'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(p.id, p.isActive)}
                        title={p.isActive ? 'Deactivate Operator' : 'Activate Operator'}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer select-none',
                          p.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', p.isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1 text-[11px] truncate max-w-[150px]" title={p.email}>
                          <Mail className="h-3 w-3 text-muted-foreground/60" />
                          <span>{p.email}</span>
                        </p>
                        {p.mobileNumber && (
                          <p className="flex items-center gap-1 text-[10px]">
                            <Phone className="h-3 w-3 text-muted-foreground/60" />
                            <span>{p.mobileNumber}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/staff/${p.id}`}>
                          <button
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setSuccessMsg(null);
                            setSelectedStaff(p);
                            setIsEditOpen(true);
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setSuccessMsg(null);
                            setSelectedStaff(p);
                            setIsPasswordOpen(true);
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setErrorMsg(null);
                            setSuccessMsg(null);
                            setSelectedStaff(p);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1 rounded hover:bg-muted hover:text-destructive text-muted-foreground transition-colors"
                          title="Delete Operator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {staff.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm font-sans">{p.fullName}</p>
                      {p.jobTitle && <p className="text-xs text-muted-foreground">{p.jobTitle}</p>}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold',
                      p.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    )}
                  >
                    {p.role.toUpperCase()}
                  </span>
                </div>

                {/* Slices of metadata */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  <div>
                    <span className="font-bold text-foreground">Status:</span>
                    <button
                      onClick={() => handleToggleStatus(p.id, p.isActive)}
                      className={cn(
                        'ml-1 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold',
                        p.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      )}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">Employee ID:</span> {p.employeeId || 'None'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-foreground">Email:</span> {p.email}
                  </div>
                  {p.mobileNumber && (
                    <div className="col-span-2">
                      <span className="font-bold text-foreground">Mobile:</span> {p.mobileNumber}
                    </div>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-1">
                  {p.sectors && p.sectors.length > 0 && (
                    p.sectors.map((s) => (
                      <span key={s.id} className="text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border">
                        {s.name}
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2 border-t border-border/50 pt-2.5">
                  <Link href={`/dashboard/staff/${p.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-[10px] h-8">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] h-8"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setSelectedStaff(p);
                      setIsEditOpen(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] h-8"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setSelectedStaff(p);
                      setIsPasswordOpen(true);
                    }}
                  >
                    <KeyRound className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive p-2"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setSelectedStaff(p);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================
          MODAL: ADD STAFF
      ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-14 px-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-serif">
                <UserPlus className="h-4.5 w-4.5 text-primary" />
                Add New Staff Member
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-500 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-semibold">{successMsg}</span>
                  </div>
                  {generatedCreds && (
                    <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 rounded font-mono text-[10px] space-y-1">
                      <p><strong>Email:</strong> {generatedCreds.email}</p>
                      <p><strong>Temp Password:</strong> {generatedCreds.pass}</p>
                      <p className="text-[9px] italic mt-1 text-emerald-400">Share these login credentials with the operator.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. Shibin Shahsad"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="operator@kanshub.com"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    placeholder="9946903908"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    placeholder="e.g. KANS-2026-08"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="jobTitle"
                    placeholder="Project Coordinator"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    defaultValue="staff"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  >
                    <option value="staff">Staff Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="text"
                    name="tempPassword"
                    required
                    defaultValue={Math.random().toString(36).substring(2, 10) + 'A1!'}
                    placeholder="Enter login password"
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-2">
                    Assigned Sectors (Can select multiple)
                  </label>
                  <div className="grid grid-cols-2 gap-2 border border-border bg-muted/10 rounded-lg p-3">
                    {sectors.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 select-none cursor-pointer p-0.5 hover:text-foreground">
                        <input
                          type="checkbox"
                          name="sectorIds"
                          value={s.id}
                          className="rounded text-primary focus:ring-primary h-4 w-4 bg-background border-input"
                        />
                        <span className="text-xs">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Operator'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT STAFF
      ======================================================== */}
      {isEditOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-14 px-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-serif">
                <Edit2 className="h-4.5 w-4.5 text-primary" />
                Edit Staff Member: {selectedStaff.fullName}
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={selectedStaff.fullName}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={selectedStaff.email || ''}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    defaultValue={selectedStaff.mobileNumber || ''}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    defaultValue={selectedStaff.employeeId || ''}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="jobTitle"
                    defaultValue={selectedStaff.jobTitle || ''}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    defaultValue={selectedStaff.role}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  >
                    <option value="staff">Staff Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    name="isActive"
                    defaultValue={selectedStaff.isActive ? 'true' : 'false'}
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive / Suspended</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                    Internal Notes / Comments
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={selectedStaff.notes || ''}
                    placeholder="Enter internal operator log notes..."
                    className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-2">
                    Assigned Sectors
                  </label>
                  <div className="grid grid-cols-2 gap-2 border border-border bg-muted/10 rounded-lg p-3">
                    {sectors.map((s) => {
                      const isAssigned = selectedStaff.sectors?.some((selected) => selected.id === s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 select-none cursor-pointer p-0.5 hover:text-foreground">
                          <input
                            type="checkbox"
                            name="sectorIds"
                            value={s.id}
                            defaultChecked={isAssigned}
                            className="rounded text-primary focus:ring-primary h-4 w-4 bg-background border-input"
                          />
                          <span className="text-xs">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RESET PASSWORD
      ======================================================== */}
      {isPasswordOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
            <div className="h-14 px-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-serif">
                <KeyRound className="h-4.5 w-4.5 text-primary" />
                Reset Password
              </h2>
              <button
                onClick={() => setIsPasswordOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-normal">
                Set a new password for <strong>{selectedStaff.fullName}</strong>. This action will overwrite their current login credentials immediately.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-[#060606] dark:text-foreground uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  name="newPassword"
                  required
                  placeholder="At least 6 characters"
                  defaultValue={Math.random().toString(36).substring(2, 10) + 'B2!'}
                  className="w-full px-3 py-2 border border-border bg-background rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Confirm Reset'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE / DEACTIVATE CONFIRMATION
      ======================================================== */}
      {isDeleteOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
            <div className="h-14 px-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-bold text-destructive flex items-center gap-1.5 font-serif">
                <Trash2 className="h-4.5 w-4.5" />
                Delete Staff Account
              </h2>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-normal">
                Are you sure you want to delete the operator account for <strong>{selectedStaff.fullName}</strong>?
              </p>
              <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-lg text-amber-500 leading-normal">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <Ban className="h-3.5 w-3.5" />
                  Soft Delete Action
                </span>
                This soft-deletes their profile history in the dashboard database, logs out their active session immediately, and changes their auth email to free up the original address for future reuse.
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="bg-destructive hover:bg-destructive/95 text-white hover:text-white border-destructive text-xs"
                  onClick={handleDeleteSubmit}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
