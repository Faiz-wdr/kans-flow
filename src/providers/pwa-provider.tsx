'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDialog } from '@/providers/dialog-provider';
import { IOSInstallDialog } from '@/components/pwa/IOSInstallDialog';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
  promptInstall: () => Promise<void>;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const { showToast } = useDialog();

  useEffect(() => {
    // 1. Detect if installed already (standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode);
    };

    // 2. Detect iOS device
    const detectIOS = () => {
      const userAgent = navigator.userAgent;
      const isIOSDevice =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (userAgent.includes('Mac') && 'ontouchend' in document);
      setIsIOS(isIOSDevice);
    };

    checkStandalone();
    detectIOS();

    // 3. Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // 4. Handle beforeinstallprompt (Chromium/Android etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Handle appinstalled (fires when browser successfully installs PWA)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      showToast('KANs Flow installed successfully!', 'success');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Check if banner has been dismissed previously
    const dismissed = localStorage.getItem('pwa-install-banner-dismissed') === 'true';
    setIsBannerDismissed(dismissed);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const promptInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      console.warn('Install prompt not available. Application might not meet PWA criteria or has already been installed.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setIsInstallable(false);
        setDeferredPrompt(null);
      } else {
        console.log('User dismissed the PWA install prompt');
      }
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
    }
  };

  const dismissBanner = () => {
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
    setIsBannerDismissed(true);
  };

  // We consider it "installable" if:
  // 1. We are NOT already installed (standalone mode)
  // 2. AND we have a deferredPrompt event OR we are on iOS (which uses custom prompt instructions)
  const installableComputed = !isInstalled && (isInstallable || isIOS);

  return (
    <PWAContext.Provider
      value={{
        isInstallable: installableComputed,
        isInstalled,
        isIOS,
        showIOSInstructions,
        setShowIOSInstructions,
        promptInstall,
        isBannerDismissed,
        dismissBanner,
      }}
    >
      {children}
      <IOSInstallDialog />
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
