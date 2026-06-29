'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { verifyAgreementTokenAction, submitSignedAgreementAction } from '../../actions';
import { SignaturePad } from '@/components/agreements/SignaturePad';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, FileText, CheckCircle2, AlertCircle, Download, ExternalLink, ArrowRight } from 'lucide-react';

export default function SignAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreementData, setAgreementData] = useState<any>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [request, setRequest] = useState<any>(null);

  // Signing form states
  const [isChecked, setIsChecked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function verify() {
      setLoading(true);
      setError(null);
      const res = await verifyAgreementTokenAction(token);
      if (!res.success) {
        setError(res.error || 'Invalid agreement token');
      } else {
        setAgreementData(res.agreementData);
        setHtmlContent(res.htmlContent || '');
        setRequest(res.request);

        if (res.request.agreementStatus === 'Signed') {
          setIsSuccess(true);
          setSignedPdfUrl(res.request.signedPdfUrl);
        }
      }
      setLoading(false);
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecked || !signatureDataUrl || submitting) return;

    setSubmitting(true);
    setError(null);

    const res = await submitSignedAgreementAction(token, signatureDataUrl);
    if (!res.success) {
      setError(res.error || 'Failed submitting agreement');
      setSubmitting(false);
    } else {
      setIsSuccess(true);
      setSignedPdfUrl(res.signedPdfUrl || null);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 font-sans p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold text-foreground">Verifying Agreement Security Token...</p>
        <p className="text-xs text-muted-foreground mt-1">Fetching agreement details from KANs HUB</p>
      </div>
    );
  }

  if (error && !agreementData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 font-sans p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Agreement Verification Failed</h2>
          <p className="text-xs text-muted-foreground leading-normal">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="text-xs font-semibold">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 font-sans p-4 animate-fade-in">
        <div className="w-full max-w-md bg-card border border-emerald-500/20 rounded-2xl p-8 shadow-2xl text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              Agreement Executed
            </span>
            <h2 className="text-xl font-black text-foreground">Digital Signature Submitted!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Thank you, <strong>{agreementData?.applicantName}</strong>. Your Virtual Office Agreement for <strong>{agreementData?.companyName}</strong> has been legally signed and processed.
            </p>
          </div>

          {signedPdfUrl && (
            <div className="pt-2">
              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Download Executed Agreement PDF</span>
              </a>
            </div>
          )}

          <div className="border-t border-border pt-4 text-[11px] text-muted-foreground">
            A copy of your executed agreement has been sent to your email.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 font-sans pb-20">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3.5 px-4 sm:px-8 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-white font-bold font-serif flex items-center justify-center text-sm">
              K
            </div>
            <div>
              <h1 className="text-xs font-bold text-foreground leading-none">KANs HUB Virtual Office</h1>
              <span className="text-[10px] text-muted-foreground font-mono">Ref: {agreementData?.applicationRef}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-600 text-[11px] font-bold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure E-Signature Portal</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Intro Banner */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
              Review Action Required
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground mt-1">
              Virtual Office Service Agreement for {agreementData?.companyName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please review the terms below and provide your digital signature at the bottom of the page.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Agreement HTML Document Frame */}
        <div className="bg-white border border-border rounded-2xl p-4 sm:p-8 shadow-lg overflow-x-auto">
          <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            className="prose prose-slate max-w-none"
          />
        </div>

        {/* Signature & Execution Form Box */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Digital Agreement Execution</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete the required verification checkbox and signature drawing to finalize your onboarding.
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
            />
            <span className="text-xs font-semibold text-foreground leading-relaxed">
              I have read, understood, and accept the complete terms & conditions of the Virtual Office Agreement for <strong>{agreementData?.companyName}</strong>.
            </span>
          </label>

          {/* Signature Pad */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Draw Client E-Signature *
            </label>
            <SignaturePad onSignatureChange={setSignatureDataUrl} />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isChecked || !signatureDataUrl || submitting}
            className="w-full h-12 text-xs font-bold gap-2 cursor-pointer shadow-lg transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Locking Agreement & Generating Signed PDF...</span>
              </>
            ) : (
              <>
                <span>Sign & Execute Agreement</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
