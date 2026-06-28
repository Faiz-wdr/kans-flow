'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { virtualOfficeSchema, type VirtualOfficeInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { submitVirtualOfficeAction } from '../actions';
import {
  Upload,
  Check,
  CheckCircle2,
  Loader2,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Search,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';

const NATURE_OF_BUSINESS_OPTIONS = [
  'IT & Software Services (Web, Apps, Development)',
  'E-commerce & Online Retail',
  'Food, Beverages & FSSAI Products',
  'Business & Management Consulting',
  'Digital Marketing & Branding',
  'Travel, Tourism & Ticketing',
  'Education & Ed-Tech Services',
  'Financial & Accounting Services',
  'Real Estate & Interior Design',
  'General Trading',
  'Healthcare, Wellness & Medical',
  'Event Management & Hospitality',
  'Legal & Professional Services',
  'Other',
];

const REASON_OPTIONS = [
  'GST Registration',
  'ROC / Company Incorporation',
  'Bank Account Opening',
  'Business Address for Marketing',
  'Other',
];

const HEAR_ABOUT_OPTIONS = [
  'Facebook / Instagram',
  'YouTube',
  'Google',
  'Friend / Referral',
  'Other',
];

export default function VirtualOfficeFormPage() {
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState<string>('');

  // Logo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state for Nature of Business dropdown
  const [businessSearch, setBusinessSearch] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VirtualOfficeInput>({
    resolver: zodResolver(virtualOfficeSchema),
    defaultValues: {
      startDate: todayStr,
      plan: 'Silver',
      natureOfBusiness: '',
      stampPaper: '₹100',
      reasonForVo: 'GST Registration',
      consultantHandling: 'No',
      hearAboutUs: 'Google',
      tentativeCompletionDate: '',
    },
  });

  const selectedPlan = watch('plan');
  const natureOfBusiness = watch('natureOfBusiness');
  const companyLogoUrl = watch('companyLogoUrl');
  const stampPaper = watch('stampPaper');
  const reasonForVo = watch('reasonForVo');
  const consultantHandling = watch('consultantHandling');
  const hearAboutUs = watch('hearAboutUs');

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only image files (JPEG, PNG, WEBP, SVG) are allowed for company logo.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 15));
    }, 120);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('id-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true') {
          console.warn('Supabase logo upload fallback in dev:', error);
          setUploadProgress(100);
          const localUrl = URL.createObjectURL(file);
          setValue('companyLogoUrl', localUrl);
          setUploadedFileName(`${file.name} (Dev Preview)`);
          setPreviewUrl(localUrl);
          return;
        }
        throw error;
      }

      setUploadProgress(100);
      const { data: { publicUrl } } = supabase.storage
        .from('id-proofs')
        .getPublicUrl(fileName);

      setValue('companyLogoUrl', publicUrl);
      setUploadedFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert(`Upload failed: ${err.message || 'Error uploading company logo.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedLogo = () => {
    setValue('companyLogoUrl', '');
    setUploadedFileName(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submission handler
  const onSubmit = async (data: VirtualOfficeInput) => {
    try {
      const res = await submitVirtualOfficeAction(data);
      if (!res.success) {
        throw new Error(res.error);
      }
      setReferenceId(res.referenceId ? res.referenceId.slice(0, 8).toUpperCase() : `VO-${Math.floor(100000 + Math.random() * 900000)}`);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Submission failed: ${err.message || 'An error occurred during submission.'}`);
    }
  };

  const filteredCategories = NATURE_OF_BUSINESS_OPTIONS.filter((item) =>
    item.toLowerCase().includes(businessSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto py-2 px-1">
      {!submitted ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="border-b border-border pb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>KANs HUB Virtual Office</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              Virtual Office Application
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Get a prestigious business address for GST registration, ROC incorporation, and official correspondence.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 font-sans">
            {/* 1. Date Picker & Plan Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Application Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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

              {/* Pricing Cards Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Select Virtual Office Plan <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Silver Card */}
                  <div
                    onClick={() => setValue('plan', 'Silver', { shouldValidate: true })}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                      selectedPlan === 'Silver'
                        ? 'border-slate-400 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/40 dark:to-slate-800/60 shadow-md ring-1 ring-slate-400'
                        : 'border-border bg-background hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {selectedPlan === 'Silver' && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-slate-600 text-white flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-2">
                      Silver Plan
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-foreground">₹6,000</span>
                      <span className="text-xs text-muted-foreground font-medium">/ 1 Year</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Ideal for new startups needing annual compliance address verification.
                    </p>
                  </div>

                  {/* Gold Card */}
                  <div
                    onClick={() => setValue('plan', 'Gold', { shouldValidate: true })}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                      selectedPlan === 'Gold'
                        ? 'border-amber-400 bg-gradient-to-br from-amber-50/60 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/20 shadow-md ring-1 ring-amber-400'
                        : 'border-border bg-background hover:border-amber-300 dark:hover:border-amber-800'
                    }`}
                  >
                    {selectedPlan === 'Gold' && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 mb-2">
                      ★ Gold Plan (Best Value)
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-foreground">₹10,000</span>
                      <span className="text-xs text-muted-foreground font-medium">/ 2 Years</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Long-term stability with savings of ₹2,000 across 24 months.
                    </p>
                  </div>
                </div>
                {errors.plan && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.plan.message}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Company Details */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>Company & Business Profile</span>
              </h3>

              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Company Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="companyName"
                  type="text"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="e.g. Acme Innovations Pvt Ltd"
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              {/* Nature of Business Searchable Select */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Nature of Business <span className="text-destructive">*</span>
                </label>

                {/* Selected value button */}
                <div
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center justify-between cursor-pointer focus:ring-1 focus:ring-primary"
                >
                  <span className={natureOfBusiness ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {natureOfBusiness || 'Select business category...'}
                  </span>
                  <span className="text-xs text-muted-foreground">▼</span>
                </div>

                {/* Dropdown Menu */}
                {isSelectOpen && (
                  <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-background shadow-lg p-2 space-y-2 max-h-60 overflow-y-auto">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        className="w-full rounded-md border border-input pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-muted/10"
                        placeholder="Search categories..."
                        value={businessSearch}
                        onChange={(e) => setBusinessSearch(e.target.value)}
                      />
                    </div>
                    <div className="divide-y divide-border/50 text-xs">
                      {filteredCategories.length === 0 ? (
                        <div className="p-2 text-muted-foreground text-center">No categories found</div>
                      ) : (
                        filteredCategories.map((opt) => (
                          <div
                            key={opt}
                            onClick={() => {
                              setValue('natureOfBusiness', opt, { shouldValidate: true });
                              setIsSelectOpen(false);
                            }}
                            className={`p-2 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between ${
                              natureOfBusiness === opt ? 'font-bold text-primary bg-primary/5' : 'text-foreground'
                            }`}
                          >
                            <span>{opt}</span>
                            {natureOfBusiness === opt && <Check className="h-3 w-3" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {errors.natureOfBusiness && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.natureOfBusiness.message}
                  </p>
                )}
              </div>

              {/* Conditional Nature of Business Other */}
              {natureOfBusiness === 'Other' && (
                <div className="animate-fade-in pt-1">
                  <label htmlFor="natureOfBusinessOther" className="block text-xs font-semibold text-muted-foreground mb-1">
                    Please specify your business <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="natureOfBusinessOther"
                    type="text"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Enter custom business details"
                    {...register('natureOfBusinessOther')}
                  />
                  {errors.natureOfBusinessOther && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.natureOfBusinessOther.message}
                    </p>
                  )}
                </div>
              )}

              {/* Emails Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email1" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Primary Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="email1"
                    type="email"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="contact@company.com"
                    {...register('email1')}
                  />
                  {errors.email1 && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.email1.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email2" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Secondary Email Address (Optional)
                  </label>
                  <input
                    id="email2"
                    type="email"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="accounts@company.com"
                    {...register('email2')}
                  />
                  {errors.email2 && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.email2.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Company Logo Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Company Logo (Optional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                {!companyLogoUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center cursor-pointer bg-background hover:bg-muted/10 transition-colors flex flex-col items-center justify-center gap-1.5 group"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4" />}
                    </div>
                    {isUploading ? (
                      <div className="w-full max-w-[140px] space-y-1">
                        <p className="text-[11px] text-foreground font-semibold">Uploading logo...</p>
                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-foreground">Click to upload company logo</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WEBP, or SVG up to 5MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-border rounded-lg p-2.5 bg-background flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewUrl && (
                        <img src={previewUrl} alt="Company Logo Preview" className="h-9 w-9 object-contain rounded border border-border bg-muted/20" />
                      )}
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-foreground truncate">{uploadedFileName || 'Company Logo'}</p>
                        <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 mt-0.5">
                          <Check className="h-3 w-3" />
                          <span>Uploaded successfully</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedLogo}
                      className="h-7 w-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* GSTIN Field */}
              <div>
                <label htmlFor="gstin" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  id="gstin"
                  type="text"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary uppercase tracking-wider font-mono text-xs"
                  placeholder="e.g. 32AAAAA0000A1Z5"
                  {...register('gstin')}
                />
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 shrink-0 text-primary" />
                  <span>This GSTIN will be displayed on the KANs HUB Digital Nameboard.</span>
                </p>
              </div>
            </div>

            {/* 3. Stamp Paper & Compliance Details */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>Documentation & Stamp Paper</span>
              </h3>

              {/* Stamp Paper Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Required Stamp Paper <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['₹100', '₹200', '₹500'].map((val) => (
                    <div
                      key={val}
                      onClick={() => setValue('stampPaper', val as any, { shouldValidate: true })}
                      className={`cursor-pointer rounded-lg border-2 py-2.5 text-center transition-all ${
                        stampPaper === val
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      <span className="text-sm font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
                {errors.stampPaper && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.stampPaper.message}
                  </p>
                )}
              </div>

              {/* Reason for VO */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Reason for Taking Virtual Office <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2">
                  {REASON_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="radio"
                        value={opt}
                        className="h-4 w-4 border-input text-primary focus:ring-primary cursor-pointer"
                        {...register('reasonForVo')}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {reasonForVo === 'Other' && (
                  <div className="mt-2 pl-6 animate-fade-in">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Please specify your reason"
                      {...register('reasonForVoOther')}
                    />
                    {errors.reasonForVoOther && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.reasonForVoOther.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Qualitative Insights & Challenges */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                <span>Business Context & Operational Challenges</span>
              </h3>

              {/* Biggest Challenge */}
              <div>
                <label htmlFor="biggestChallenge" className="block text-xs font-semibold text-foreground mb-1">
                  What was the biggest challenge you faced before finding KANs HUB? <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="biggestChallenge"
                  rows={2}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Share your experience (e.g. high office deposit costs, difficult landlord verification)..."
                  {...register('biggestChallenge')}
                />
                {errors.biggestChallenge && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.biggestChallenge.message}
                  </p>
                )}
              </div>

              {/* Current Problem */}
              <div>
                <label htmlFor="currentProblem" className="block text-xs font-semibold text-foreground mb-1">
                  What specific problem are you trying to solve right now? <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="currentProblem"
                  rows={2}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Share details (e.g. urgent ROC filing deadline, bank account verification)..."
                  {...register('currentProblem')}
                />
                {errors.currentProblem && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.currentProblem.message}
                  </p>
                )}
              </div>
            </div>

            {/* 5. Operations & Timeline */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Consultant & Registration Timeline</span>
              </h3>

              {/* Consultant Handling */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Consultant Handling Registration <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {['Yes', 'No', 'Self-managing'].map((val) => (
                    <div
                      key={val}
                      onClick={() => setValue('consultantHandling', val as any, { shouldValidate: true })}
                      className={`cursor-pointer rounded-lg border-2 py-2 text-center transition-all ${
                        consultantHandling === val
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How Did You Hear About Us */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  How Did You Hear About Us? <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {HEAR_ABOUT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-foreground cursor-pointer select-none">
                      <input
                        type="radio"
                        value={opt}
                        className="h-4 w-4 border-input text-primary focus:ring-primary cursor-pointer"
                        {...register('hearAboutUs')}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {hearAboutUs === 'Other' && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Please specify source"
                      {...register('hearAboutUsOther')}
                    />
                    {errors.hearAboutUsOther && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.hearAboutUsOther.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tentative Registration Completion Date */}
              <div>
                <label htmlFor="tentativeCompletionDate" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Tentative Registration Completion Date <span className="text-destructive">*</span>
                </label>
                <input
                  id="tentativeCompletionDate"
                  type="date"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  {...register('tentativeCompletionDate')}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The required documents should be submitted before this date for filing and inspection.
                </p>
                {errors.tentativeCompletionDate && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.tentativeCompletionDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Error Summary Box */}
            {Object.keys(errors).length > 0 && (
              <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please review required fields:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {Object.entries(errors).map(([key, err]) => err?.message && <li key={key}>{(err as any).message}</li>)}
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full h-11 text-sm font-bold shadow-lg" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Submitting Virtual Office Application...</span>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Submit Virtual Office Application</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </div>
      ) : (
        /* SUCCESS SCREEN */
        <div className="text-center py-10 space-y-6 animate-fade-in font-sans">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Application Submitted Successfully!
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your Virtual Office application has been submitted successfully. Our team will review your application and contact you shortly.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-center max-w-sm mx-auto space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Application Reference Number</span>
            <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{referenceId}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                reset();
                removeUploadedLogo();
                setSubmitted(false);
              }}
            >
              Submit Another Application
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
