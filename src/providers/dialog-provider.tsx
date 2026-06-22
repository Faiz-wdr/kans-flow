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
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
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
