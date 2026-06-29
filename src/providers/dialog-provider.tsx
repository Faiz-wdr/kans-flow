'use client';

import React, { createContext, useContext, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface DialogOptions {
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface DialogContextType {
  showAlert: (title: string, message: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showAlert = (title: string, message: string) => {
    setDialog({ title, message, type: 'alert' });
    setIsOpen(true);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setDialog({
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    });
    setIsOpen(true);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (dialog?.onConfirm) dialog.onConfirm();
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (dialog?.onCancel) dialog.onCancel();
  };

  const getDialogIcon = () => {
    if (!dialog) return null;
    const titleLower = dialog.title.toLowerCase();
    
    if (
      titleLower.includes('delete') || 
      titleLower.includes('reject') || 
      titleLower.includes('remove') || 
      titleLower.includes('release')
    ) {
      return (
        <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-1">
          <AlertTriangle className="h-6 w-6" />
        </div>
      );
    }
    
    if (
      titleLower.includes('success') || 
      titleLower.includes('approved') || 
      titleLower.includes('saved') || 
      titleLower.includes('updated')
    ) {
      return (
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-1">
          <CheckCircle2 className="h-6 w-6" />
        </div>
      );
    }
    
    if (titleLower.includes('failed') || titleLower.includes('error')) {
      return (
        <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-1">
          <AlertCircle className="h-6 w-6" />
        </div>
      );
    }
    
    return (
      <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
        <Info className="h-6 w-6" />
      </div>
    );
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      {/* Toast Notification Floating Container */}
      <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 bg-foreground text-background dark:bg-card dark:text-foreground border border-border/40 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold animate-slide-in font-sans transition-all"
          >
            {t.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {isOpen && dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => {
              if (dialog.type === 'alert') setIsOpen(false);
            }}
          />
          {/* Dialog Container */}
          <div className="relative w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl p-6 flex flex-col items-center text-center space-y-4 animate-slide-in">
            {getDialogIcon()}
            <div className="space-y-1.5 w-full">
              <h3 className="text-sm font-bold text-foreground tracking-tight select-none">
                {dialog.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-normal whitespace-pre-line">
                {dialog.message}
              </p>
            </div>
            
            <div className="flex gap-2 justify-center w-full pt-3 border-t border-border">
              {dialog.type === 'confirm' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold px-4 cursor-pointer flex-1"
                  onClick={handleCancel}
                >
                  {dialog.cancelText || 'Cancel'}
                </Button>
              )}
              <Button
                size="sm"
                className={`h-8 text-xs font-bold px-4 cursor-pointer flex-1 ${
                  dialog.type === 'confirm' && 
                  (dialog.title.toLowerCase().includes('delete') || 
                   dialog.title.toLowerCase().includes('reject') || 
                   dialog.title.toLowerCase().includes('release'))
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                    : ''
                }`}
                onClick={handleConfirm}
              >
                {dialog.type === 'confirm' ? dialog.confirmText || 'Confirm' : 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
