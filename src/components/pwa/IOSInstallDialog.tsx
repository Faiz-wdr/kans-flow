'use client';

import React from 'react';
import { usePWA } from '@/providers/pwa-provider';
import { X, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IOSInstallDialog() {
  const { showIOSInstructions, setShowIOSInstructions } = usePWA();

  if (!showIOSInstructions) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setShowIOSInstructions(false)}
      />

      {/* Dialog content */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-slide-in flex flex-col gap-5 text-left select-none">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Install KANs Flow
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Safari iOS Setup
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground leading-relaxed">
          Add KANs Flow to your home screen to run it as a standalone app with push notification support and offline operational capability.
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
              1
            </div>
            <div className="text-xs leading-normal">
              Tap Safari's <strong className="text-foreground font-bold">Share</strong> icon in the bottom menu bar:
              <div className="mt-2 flex items-center justify-center py-2 bg-muted/40 border border-border rounded-xl">
                <svg className="w-5 h-5 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="9" width="14" height="12" rx="2" ry="2" />
                  <path d="M12 2v13" />
                  <path d="M9 5l3-3 3 3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
              2
            </div>
            <div className="text-xs leading-normal">
              Scroll down the menu list and tap <strong className="text-foreground font-bold">Add to Home Screen</strong>:
              <div className="mt-2 flex items-center justify-between px-3 py-2 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span className="font-semibold text-foreground text-[11px]">Add to Home Screen</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-border flex justify-end">
          <Button
            size="sm"
            onClick={() => setShowIOSInstructions(false)}
            className="w-full text-xs font-bold py-2 cursor-pointer rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground transition-all"
          >
            Close Instructions
          </Button>
        </div>
      </div>
    </div>
  );
}
