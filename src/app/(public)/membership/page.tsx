'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { membershipSchema, type MembershipInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { submitOnboardingRequest } from '@/services/db/onboarding';
import {
  Upload,
  Check,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';

export default function MembershipFormPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<MembershipInput>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      purposeType: 'Student',
      idProofType: 'Aadhar',
      seatPreference: 'coworking',
    },
  });

  const purposeType = watch('purposeType');
  const idProofUrl = watch('idProofUrl');
  const idProofType = watch('idProofType');

  // 1. Handle File Upload to Supabase Storage
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // File validation: Size limit 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    // File validation: Types allowed (images, PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only image files (JPEG, PNG, WEBP) or PDFs are allowed.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Mock progress simulation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 150);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('id-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true') {
          console.warn('Supabase storage upload failed, using local mock preview in development:', error);
          setUploadProgress(100);

          // Use a placeholder public image or a local object URL for preview
          const mockUrl = file.type === 'application/pdf'
            ? 'https://plqikziueqfbdawfnlyn.supabase.co/storage/v1/object/public/id-proofs/mock-document.pdf'
            : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

          setValue('idProofUrl', mockUrl);
          setUploadedFileName(`${file.name} (Dev Fallback)`);

          if (file.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(file));
          } else {
            setPreviewUrl(null);
          }

          await trigger('idProofUrl');
          return;
        }
        throw error;
      }

      setUploadProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('id-proofs')
        .getPublicUrl(fileName);

      setValue('idProofUrl', publicUrl);
      setUploadedFileName(file.name);

      // Set preview for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null); // Keep null to show document icon for PDFs
      }

      // Revalidate field
      await trigger('idProofUrl');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(`Upload failed: ${err.message || 'Please check storage bucket RLS policies.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeUploadedFile = () => {
    setValue('idProofUrl', '');
    setUploadedFileName(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. Handle Form Submission
  const onSubmit = async (data: MembershipInput) => {
    try {
      const supabase = createClient();
      const { error } = await submitOnboardingRequest(supabase, data);
      if (error) throw error;
      setStep(3);
    } catch (err: any) {
      console.error('Form submission error:', err);
      alert(`Submission failed: ${err.message || 'Please verify database connectivity.'}`);
    }
  };

  return (
    <div className="w-full">
      {/* STEP 1: TERMS & CONDITIONS */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Membership Terms &amp; Conditions
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Please read and acknowledge the space regulations before continuing.
            </p>
          </div>

          {/* Terms Block */}
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <h3 className="font-bold text-foreground text-base border-b border-border pb-1.5">Space Guidelines &amp; Policies</h3>
            <ol className="list-decimal pl-4 space-y-3">
              <li>
                <strong className="text-foreground">Members Only:</strong> Only registered members are allowed inside. Guests must get permission from the Project Coordinator/Manager at reception.
              </li>
              <li>
                <strong className="text-foreground">Security Deposit:</strong> A refundable security deposit of ₹1500 is required at admission. This is refunded upon vacating, provided all dues are clear and the access card is returned.
              </li>
              <li>
                <strong className="text-foreground">Cancellation Notice:</strong> Members must inform management 30 days before leaving. Failure to provide this notice will result in the strict forfeiture of the ₹1500 security deposit.
              </li>
              <li>
                <strong className="text-foreground">Access Card:</strong> Always carry your card. This card serves as your Membership Card. It must be returned in good condition upon vacating to process your refund.
              </li>
              <li>
                <strong className="text-foreground">Prepaid Rent:</strong> Monthly rent is ₹1499, payable on or before the 25th of every month for the upcoming month.
              </li>
              <li>
                <strong className="text-foreground">Late Payment:</strong> If rent is not cleared by the 25th, a Daily Pay-and-Use rate of ₹200 applies. Daily payments cannot be adjusted against the monthly fee later. To avoid complexity, pay ₹1499 on the 25th.
              </li>
              <li>
                <strong className="text-foreground">Non-Refundable Policy:</strong> All paid rent amounts are strictly non-refundable under any circumstances.
              </li>
              <li>
                <strong className="text-foreground">Silent Zone:</strong> Keep noise to a minimum. This is a quiet area for focus and productivity.
              </li>
              <li>
                <strong className="text-foreground">Footwear Policy:</strong> Using outside footwear inside the premises is strictly prohibited. Please place all footwear neatly on the shoe rack. Do not leave shoes in front of the door, as it blocks the entrance and looks untidy.
              </li>
              <li>
                <strong className="text-foreground">Bathroom Etiquette:</strong> Use the provided bathroom slippers inside the bathroom only. After use, leave the slippers inside the bathroom; do not wear or keep them outside. Always close the door and turn off the light after use.
              </li>
              <li>
                <strong className="text-foreground">Audio Etiquette:</strong> Loud music or audio is prohibited. Use earphones for all media; ensure volume is not audible to others.
              </li>
              <li>
                <strong className="text-foreground">Phone Etiquette:</strong> Keep devices on silent/vibrate. Attend all calls from the outside veranda or from the pantry area.
              </li>
              <li>
                <strong className="text-foreground">Cleanliness:</strong> Keep your area tidy. Use the bins provided and use the shoe rack for footwear to avoid a mess near the entrance.
              </li>
              <li>
                <strong className="text-foreground">Food &amp; Drink:</strong> Only bottled water is allowed at desks. All food must be consumed in the Pantry area.
              </li>
              <li>
                <strong className="text-foreground">Personal Items:</strong> You are responsible for your belongings. KANs HUB is not liable for lost or stolen items.
              </li>
              <li>
                <strong className="text-foreground">Your Space:</strong> Use only your assigned desk and chair. Do not move furniture. Before leaving, push your chair in properly.
              </li>
              <li>
                <strong className="text-foreground">Property Care:</strong> Do not damage, mark, or draw on desks, walls, or other property. Any damage will result in repair or replacement charges.
              </li>
              <li>
                <strong className="text-foreground">Electricity:</strong> Use only your assigned desk light/fan. The last person leaving must turn off all lights/fans (including washroom/pantry).
                <li>
                </li>
                <strong className="text-foreground">AC Usage:</strong> For AC Room members, the AC will be active from 10:00 AM to 4:00 PM (subject to change). The management holds full control over AC settings and timings. Members are requested to keep doors shut during these hours to ensure a comfortable atmosphere for all.
              </li>
              <li>
                <strong className="text-foreground">Access 24/7 &amp; Sundays:</strong> The premises are available for use 24/7, including Sundays. Please note that AC will not be available on Sundays.
              </li>
              <li>
                <strong className="text-foreground">Surveillance:</strong> The entire premise is under 24/7 CCTV surveillance for safety and security.
              </li>
              <li>
                <strong className="text-foreground">Professionalism:</strong> Treat staff and members with respect. Contact management immediately regarding any issues; do not indulge in unnecessary talks or fights with co-mates.
              </li>
              <li>
                <strong className="text-foreground">Parking:</strong> Park two-wheelers without obstructing ground-floor shops. Do not lock the handle of your bike, as it may need to be moved to allow other vehicles out.
              </li>
              <li>
                <strong className="text-foreground">Support:</strong> For assistance, contact Shibin Shahsad (Project Manager) at 9946-903-908 or visit the Reception (2nd Floor).
              </li>
            </ol>

            {/* Checkbox and button now at the bottom of the terms list */}
            <div className="space-y-4 pt-6 border-t border-border mt-8">
              {/* Declaration Checkbox */}
              <div className="flex items-start gap-3 rounded-lg border border-border p-3.5 bg-muted/5">
                <input
                  id="terms-checkbox"
                  type="checkbox"
                  className="mt-0.5 h-4.5 w-4.5 rounded border-input text-primary focus:ring-primary bg-background cursor-pointer"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="terms-checkbox" className="text-xs leading-normal text-muted-foreground select-none cursor-pointer">
                  I have read and understood the points listed above. I agree to abide by the rules of KANs HUB and understand that failure to comply may lead to termination of my membership.
                </label>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!termsAccepted}
                onClick={() => setStep(2)}
              >
                <span>Continue to Form</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: MEMBERSHIP APPLICATION FORM */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
                Membership Details
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your details to submit your application.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border px-2.5 py-1 rounded-md bg-muted/10 hover:bg-muted/30 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name and Email Address Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="John Doe"
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="john.doe@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Grid layout for Phone and Joining Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="9876543210"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="startDate" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Joining Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.startDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <label htmlFor="emergencyContact" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Emergency Contact Number
              </label>
              <input
                id="emergencyContact"
                type="tel"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="9876543210"
                {...register('emergencyContact')}
              />
              {errors.emergencyContact && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.emergencyContact.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permanent Address
              </label>
              <textarea
                id="address"
                rows={2}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="Enter your street name, city, and pincode..."
                {...register('address')}
              />
              {errors.address && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.address.message}
                </p>
              )}
            </div>



            {/* Purpose of Use Section (Student vs Working) */}
            <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Purpose of Use
              </label>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="radio"
                    value="Student"
                    className="h-4 w-4 border-input text-primary focus:ring-primary cursor-pointer"
                    {...register('purposeType')}
                  />
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>Student</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="radio"
                    value="Working"
                    className="h-4 w-4 border-input text-primary focus:ring-primary cursor-pointer"
                    {...register('purposeType')}
                  />
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Working Professional</span>
                  </div>
                </label>
              </div>

              {/* Conditional Inputs */}
              <div className="mt-3 pt-2 border-t border-border/50">
                {purposeType === 'Student' ? (
                  <div>
                    <label htmlFor="purposeDetails" className="block text-xs text-muted-foreground">
                      Preparing For (e.g. UPSC, JEE, CA, SSC)
                    </label>
                    <input
                      id="purposeDetails"
                      type="text"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      placeholder="Enter examinations name"
                      {...register('purposeDetails')}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="purposeDetails" className="block text-xs text-muted-foreground">
                      Nature of Work / Company Details
                    </label>
                    <input
                      id="purposeDetails"
                      type="text"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      placeholder="e.g. Software Engineer, Remote Developer"
                      {...register('purposeDetails')}
                    />
                  </div>
                )}
                {errors.purposeDetails && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.purposeDetails.message}
                  </p>
                )}
              </div>
            </div>

            {/* ID Proof Selection & Storage Upload */}
            <div className="space-y-3 rounded-lg border border-border p-3.5 bg-muted/5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verification ID Proof Document
              </label>

              <div className="flex gap-3 text-xs">
                {['Aadhar', 'Driving License', 'Other'].map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      value={type}
                      className="h-3.5 w-3.5 border-input text-primary focus:ring-primary cursor-pointer"
                      {...register('idProofType')}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>

              {/* Upload UI Box */}
              <div className="mt-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {!idProofUrl ? (
                  <div
                    onClick={triggerUploadClick}
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-5 text-center cursor-pointer bg-background hover:bg-muted/10 transition-colors flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </div>
                    {isUploading ? (
                      <div className="w-full max-w-[150px] space-y-1">
                        <p className="text-xs text-foreground font-semibold">Uploading document...</p>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-foreground">Click to upload {idProofType} Document</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WEBP, or PDF up to 5MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-border rounded-lg p-3 bg-background flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="ID Proof Preview"
                          className="h-10 w-10 object-cover rounded border border-border"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded border border-primary/20 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-foreground truncate">{uploadedFileName || 'Uploaded ID File'}</p>
                        <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 mt-0.5">
                          <Check className="h-3 w-3" />
                          <span>Uploaded successfully</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="h-7 w-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {errors.idProofUrl && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.idProofUrl.message}
                  </p>
                )}
              </div>
            </div>

            {/* Special Requests / Notes */}
            <div>
              <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Special Requests / Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. require desk near window, plug-point availability details, etc."
                {...register('notes')}
              />
            </div>

            {/* Error Summary Panel */}
            {Object.keys(errors).length > 0 && (
              <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please correct the errors in the form:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {Object.entries(errors).map(([key, err]) => {
                    if (!err) return null;
                    const fieldNames: Record<string, string> = {
                      fullName: 'Full Name',
                      email: 'Email Address',
                      phone: 'Contact Number',
                      startDate: 'Joining Date',
                      emergencyContact: 'Emergency Contact Number',
                      address: 'Permanent Address',
                      seatPreference: 'Seat Preference',
                      idProofUrl: 'ID Proof Document',
                      purposeType: 'Purpose of Use',
                      purposeDetails: 'Purpose details',
                    };
                    const name = fieldNames[key] || key;
                    return (
                      <li key={key}>
                        <strong>{name}:</strong> {(err as any).message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <span>Submit Membership Request</span>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 3: SUCCESS STATE */}
      {step === 3 && (
        <div className="text-center py-6 space-y-5 animate-fade-in">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              Application Submitted!
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your onboarding request has been registered and is currently under review by our workspace operators.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/5 p-4 text-xs text-left space-y-2.5 max-w-sm mx-auto leading-normal">
            <h4 className="font-bold text-foreground">What happens next?</h4>
            <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
              <li>Our workspace manager will verify your uploaded ID proof.</li>
              <li>You will receive an email/call detailing desk assignments and access card allocation details.</li>
              <li>The refundable security deposit of ₹1500 and first month rent are due upon arrival at the reception.</li>
            </ul>
          </div>

          <div className="border-t border-border pt-4 max-w-sm mx-auto">
            <p className="text-xs text-muted-foreground">
              Need immediate assistance? Contact support at:
            </p>
            <p className="text-xs font-semibold text-primary mt-1">
              support@kanshub.com | +91 98765 43210
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full max-w-[200px]"
            onClick={() => {
              removeUploadedFile();
              setStep(1);
              setTermsAccepted(false);
            }}
          >
            Submit Another Form
          </Button>
        </div>
      )}
    </div>
  );
}
