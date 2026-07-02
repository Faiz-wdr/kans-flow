'use client';

import React from 'react';
import { usePWA } from '@/providers/pwa-provider';
import { Download, X, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallBanner() {
  const { isInstallable, isBannerDismissed, promptInstall, dismissBanner } = usePWA();

  if (!isInstallable || isBannerDismissed) {
    return null;
  }

  return (
    <div className="relative mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-sm overflow-hidden animate-fade-in font-sans">
      {/* Decorative ambient background glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={dismissBanner}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 h-7 w-7 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6 sm:pr-8">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
              <span>Install KANs Flow</span>
              <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">PWA</span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
              Add KANs Flow to your home screen for quick, application-style access. Enjoy faster load times, offline queue access, and a clean workspace interface.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={dismissBanner}
            className="h-8 text-xs font-semibold px-4 cursor-pointer rounded-xl border-border hover:bg-muted/40"
          >
            Later
          </Button>
          <Button
            size="sm"
            onClick={promptInstall}
            className="h-8 text-xs font-bold px-4 gap-1.5 cursor-pointer rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm transition-all"
          >
            <span>Install Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
