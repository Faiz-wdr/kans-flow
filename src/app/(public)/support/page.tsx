'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportRequestSchema, type SupportRequestInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { createNotification } from '@/lib/notifications/notification-service';
import {
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  MoreHorizontal,
  Phone,
  User,
  MapPin,
  Upload,
  Calendar,
  CheckCircle,
  Loader2,
  ChevronLeft,
  X,
  FileImage,
} from 'lucide-react';

// Define category items
const CATEGORIES = [
  {
    id: 'suggestion',
    title: 'Suggestion',
    description: 'Help us improve KANs Flow services',
    icon: Lightbulb,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'enquiry',
    title: 'Enquiry',
    description: 'Ask about plans, facilities, or billing',
    icon: HelpCircle,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'complaint',
    title: 'Complaint',
    description: 'Raise issues about workspace or amenities',
    icon: AlertTriangle,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'plan_change',
    title: 'Plan Change',
    description: 'Request upgrades or desk modifications',
    icon: RefreshCw,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'vacate',
    title: 'Vacate Notice',
    description: 'Submit your official 30-day exit notice',
    icon: LogOut,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Any other requests or queries',
    icon: MoreHorizontal,
    color: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20',
  },
];

interface ActiveMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organizationId: string | null;
  seatNumber: string;
}

function SupportFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Member Lookup states
  const [mobileNumber, setMobileNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Selection states for duplicate members
  const [matchingMembers, setMatchingMembers] = useState<ActiveMember[]>([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Selected Member details (read-only)
  const [selectedMember, setSelectedMember] = useState<ActiveMember | null>(null);

  // Image Upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Vacate Date state
  const [expectedVacateDate, setExpectedVacateDate] = useState('');
  const [vacateDateError, setVacateDateError] = useState<string | null>(null);

  // Submitted ticket
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Setup form validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportRequestInput>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      clientMobile: '',
      name: '',
      email: '',
      seatNumber: '',
      category: 'other',
      description: '',
      imageUrl: '',
      expectedVacateDate: '',
      priority: 'medium',
    },
  });

  const descriptionValue = watch('description');

  // React to category URL param
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const match = CATEGORIES.find((c) => c.id === categoryParam);
      if (match) {
        setSelectedCategory(match.id);
        setValue('category', match.id as any);
        setValue('priority', match.id === 'vacate' ? 'high' : 'medium');
        setStep('form');
      }
    }
  }, [searchParams, setValue]);

  // Handle Category Selection
  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setValue('category', catId as any);
    setValue('priority', catId === 'vacate' ? 'high' : 'medium');
    setStep('form');
  };

  // Perform active member lookup
  const handleMemberLookup = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setLookupError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setMatchingMembers([]);

    try {
      const { data: clients, error: clientErr } = await supabase
        .from('clients')
        .select('id, full_name, email, phone, organization_id')
        .eq('phone', mobileNumber)
        .eq('status', 'active');

      if (clientErr) throw clientErr;

      if (!clients || clients.length === 0) {
        setLookupError('No active membership found with this number.');
        return;
      }

      const clientIds = clients.map((c) => c.id);
      const { data: assignments, error: assignErr } = await supabase
        .from('seat_assignments')
        .select('*, seats(name)')
        .in('client_id', clientIds)
        .eq('is_active', true);

      if (assignErr) throw assignErr;

      const seatMap = new Map<string, string>();
      if (assignments) {
        for (const ass of assignments) {
          if (ass.seats?.name) {
            seatMap.set(ass.client_id, ass.seats.name);
          }
        }
      }

      const resolvedMembers: ActiveMember[] = clients.map((client) => ({
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        phone: client.phone,
        organizationId: client.organization_id,
        seatNumber: seatMap.get(client.id) || 'Unassigned Seat',
      }));

      if (resolvedMembers.length === 1) {
        confirmMemberSelection(resolvedMembers[0]);
      } else {
        setMatchingMembers(resolvedMembers);
        setShowSelectionModal(true);
      }
    } catch (err: any) {
      console.error('Error looking up member:', err);
      setLookupError('An error occurred during lookup. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const confirmMemberSelection = (member: ActiveMember) => {
    setSelectedMember(member);
    setValue('clientId', member.id);
    setValue('clientMobile', member.phone);
    setValue('name', member.fullName);
    setValue('email', member.email);
    setValue('seatNumber', member.seatNumber);
    setShowSelectionModal(false);
  };

  // Image Upload Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadedUrl(null);
    setUploadProgress(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedUrl(null);
    setUploadProgress(null);
    setValue('imageUrl', '');
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    return new Promise((resolve, reject) => {
      const doUpload = async () => {
        setUploadProgress(10);
        try {
          const { data, error } = await supabase.storage
            .from('support-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) throw error;

          setUploadProgress(100);
          const { data: { publicUrl } } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(filePath);

          resolve(publicUrl);
        } catch (err) {
          reject(err);
        }
      };

      doUpload();
    });
  };

  const handleFormSubmit = async (formData: SupportRequestInput) => {
    setSubmitError(null);

    if (selectedCategory === 'vacate') {
      if (!expectedVacateDate) {
        setVacateDateError('Please select your expected vacate date.');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minNoticeDate = new Date();
      minNoticeDate.setDate(today.getDate() + 30);
      minNoticeDate.setHours(0, 0, 0, 0);

      const selectedDate = new Date(expectedVacateDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < minNoticeDate) {
        setVacateDateError('Notice period must be at least 30 days from today.');
        return;
      }

      setVacateDateError(null);
      formData.expectedVacateDate = expectedVacateDate;
    }

    try {
      let finalImageUrl = '';
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
        formData.imageUrl = finalImageUrl;
      }

      let orgId = selectedMember?.organizationId;
      if (!orgId) {
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        orgId = orgs && orgs.length > 0 ? orgs[0].id : null;
      }

      const { data: ticket, error: ticketErr } = await supabase
        .from('support_requests')
        .insert([
          {
            organization_id: orgId,
            client_id: selectedMember?.id || null,
            seat_number: formData.seatNumber,
            name: formData.name,
            email: formData.email,
            category: formData.category,
            subject: selectedCategory === 'vacate' ? 'Vacate Notice' : `${formData.category.toUpperCase()} Request`,
            description: formData.description,
            image_url: finalImageUrl || null,
            status: 'open',
            priority: formData.priority,
            expected_vacate_date: expectedVacateDate || null,
          }
        ])
        .select()
        .single();

      if (ticketErr) throw ticketErr;

      setTicketNumber(ticket.ticket_number || '#0000');

      if (orgId) {
        const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
        const categoryTitle = categoryObj ? categoryObj.title : 'General';

        const notificationMsg = selectedCategory === 'vacate'
          ? `New Vacate Notice submitted by **${formData.name}** (**${formData.seatNumber}**).`
          : `New support request [**${categoryTitle}**] (${ticket.ticket_number}) received from **${formData.name}** (**${formData.seatNumber}**).`;

        await createNotification(supabase, {
          organizationId: orgId,
          type: selectedCategory === 'vacate' ? 'seat_vacating' : 'support_submitted',
          recipient: { type: 'admin_staff' },
          title: selectedCategory === 'vacate' ? 'New Vacate Notice' : 'New Support Request',
          body: notificationMsg,
          referenceModule: 'support',
          referenceId: ticket.id,
          priority: selectedCategory === 'vacate' ? 'high' : 'medium',
        });
      }

      setStep('success');
      reset();
      setImageFile(null);
      setImagePreview(null);
      setExpectedVacateDate('');
      setSelectedMember(null);
      setMobileNumber('');
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      setSubmitError(err.message || 'An error occurred during submission. Please try again.');
    }
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setStep('category');
    router.replace('/support');
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 font-sans flex flex-col justify-start">
      <div className="mb-6 flex items-center justify-between">
        {step !== 'category' && step !== 'success' && (
          <button
            onClick={handleBackToCategories}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold bg-muted/50 hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        )}
        {/* <div className="text-right ml-auto">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full select-none">
            Public Portal
          </span>
        </div> */}
      </div>

      {step === 'category' && (
        <div className="space-y-6 animate-slide-in">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground bg-clip-text">
              Workspace Support
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a category below to submit an issue, notice, or request to KANs HUB staff.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className="flex flex-col items-start text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/10 hover:border-primary/30 transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98] group"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${cat.color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">
                    {cat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'form' && selectedCategory && (
        <div className="space-y-6 animate-slide-in">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.title || selectedCategory}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Submit Support Request
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Verify your active workspace membership to unlock submission.
            </p>
          </div>

          {/* Membership Verification Block */}
          {selectedMember ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5 text-xs text-foreground animate-slide-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">Membership Verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setValue('clientId', '');
                    setValue('name', '');
                    setValue('email', '');
                    setValue('seatNumber', '');
                  }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Change Number
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left pt-1 border-t border-emerald-500/10">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Name</span>
                  <span className="font-semibold text-foreground">{selectedMember.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Seat / Cabin</span>
                  <span className="font-semibold text-foreground">{selectedMember.seatNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground block">Phone</span>
                  <span className="font-semibold text-foreground">{selectedMember.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl">
              <label htmlFor="mobile" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider text-left select-none">
                Step 1: Enter Registered Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={15}
                    className="block w-full pl-9 pr-3 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-medium"
                    placeholder="Enter 10-digit number"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, ''));
                      setLookupError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMemberLookup();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  className="h-10 text-xs font-bold font-sans cursor-pointer px-4"
                  onClick={handleMemberLookup}
                  disabled={lookupLoading || !mobileNumber}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Verify</span>
                  )}
                </Button>
              </div>
              {lookupError && (
                <p className="text-xs font-medium text-rose-500 text-left flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> {lookupError}
                </p>
              )}
            </div>
          )}

          {/* Form Details */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-left">
            <div className={`space-y-4 transition-all duration-200 ${!selectedMember ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {/* Description Textarea */}
              <div className="space-y-1">
                <label htmlFor="description" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                  Step 2: Detailed Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  disabled={!selectedMember}
                  className="block w-full px-3 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none leading-normal font-sans"
                  placeholder="Please describe your issue, request, or notice details here..."
                  {...register('description')}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-medium">
                  <span>Min 10 characters</span>
                  <span className={descriptionValue?.length >= 10 ? 'text-emerald-500' : ''}>
                    {descriptionValue?.length || 0}/10
                  </span>
                </div>
                {errors.description && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Priority Select */}
              <div className="space-y-1">
                <label htmlFor="priority" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                  Priority
                </label>
                <select
                  id="priority"
                  disabled={!selectedMember}
                  className="block w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary font-medium text-foreground cursor-pointer"
                  {...register('priority')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {errors.priority && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{errors.priority.message}</p>
                )}
              </div>

              {/* Special Logic: Vacate Notice Date Picker */}
              {selectedCategory === 'vacate' && (
                <div className="space-y-2 bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Required: Expected Vacate Date</span>
                  </h4>
                  <p className="text-[10px] text-orange-600 dark:text-orange-300 leading-normal font-medium">
                    Vacate requests require a minimum 30-day notice period.
                  </p>
                  <input
                    id="expectedVacateDate"
                    type="date"
                    disabled={!selectedMember}
                    className="block w-full mt-1.5 px-3 py-2 bg-background border border-orange-200 dark:border-orange-900 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 text-foreground"
                    value={expectedVacateDate}
                    onChange={(e) => {
                      setExpectedVacateDate(e.target.value);
                      setVacateDateError(null);
                    }}
                  />
                  {vacateDateError && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-pulse">
                      ⚠️ {vacateDateError}
                    </p>
                  )}
                </div>
              )}

              {/* Optional Image Upload */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                  Attachment (Optional)
                </span>

                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20 p-1">
                    <img
                      src={imagePreview}
                      alt="Upload Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      disabled={!selectedMember}
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {uploadProgress !== null && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 text-center text-[10px] text-white font-mono">
                        Uploading Attachment: {uploadProgress}%
                      </div>
                    )}
                  </div>
                ) : (
                  <label className={`border border-dashed border-border ${selectedMember ? 'hover:border-primary/50 hover:bg-muted/10 cursor-pointer' : 'cursor-not-allowed'} bg-card rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 transition-colors select-none text-center`}>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">Attach Screenshot / Photo</span>
                    <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!selectedMember}
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {submitError && (
              <p className="text-xs font-semibold text-rose-500 mt-1 text-center bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                ⚠️ {submitError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-xs font-bold font-sans cursor-pointer transition-all duration-200 mt-2"
              disabled={!selectedMember || isSubmitting || (uploadProgress !== null && uploadProgress < 100)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Logging Support Ticket...</span>
                </>
              ) : !selectedMember ? (
                <span>Verify Mobile to Enable Submit</span>
              ) : (
                <span>Submit Ticket</span>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* 5. Step: SUCCESS SCREEN */}
      {step === 'success' && (
        <div className="space-y-6 text-center animate-slide-in">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-900/60 animate-bounce">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black text-foreground">
              Request Submitted
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Your request was logged successfully. KANs HUB staff has been notified.
            </p>
          </div>

          {/* Ticket ID Box */}
          <div className="bg-muted/30 border border-border p-4 rounded-xl max-w-[240px] mx-auto space-y-1 select-all font-sans">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Ticket Number
            </span>
            <span className="text-lg font-black text-primary font-mono tracking-wide">
              {ticketNumber}
            </span>
          </div>

          <div className="space-y-2.5 max-w-[320px] mx-auto pt-2">
            <Button
              type="button"
              className="w-full h-10 text-xs font-bold font-sans cursor-pointer"
              onClick={() => {
                setStep('category');
                setSelectedCategory(null);
                setTicketNumber('');
              }}
            >
              Submit Another Request
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-xs font-bold font-sans cursor-pointer"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      )}

      {/* 6. Active Member Selector Modal (Duplicates Phone Number check) */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowSelectionModal(false)} />
          <div className="relative w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl p-5 space-y-4 animate-slide-in">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground">Select Member Profile</h3>
              <button
                onClick={() => setShowSelectionModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Multiple members are registered with phone number <span className="font-semibold text-foreground">{mobileNumber}</span>. Please choose your profile:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {matchingMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => confirmMemberSelection(member)}
                  className="w-full flex items-center justify-between p-3 border border-border hover:border-primary/40 rounded-lg bg-card hover:bg-muted/10 transition-colors text-left text-xs font-medium cursor-pointer"
                >
                  <span className="font-semibold text-foreground">{member.fullName}</span>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                    {member.seatNumber}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-sans bg-background text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span>Loading support portal...</span>
      </div>
    }>
      <SupportFormContent />
    </Suspense>
  );
}
