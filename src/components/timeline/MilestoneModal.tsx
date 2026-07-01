'use client';

import React, { useState, useEffect } from 'react';
import type { CompanyTimeline } from '@/types';
import { Button } from '@/components/ui/button';
import { X, Calendar, Type, AlignLeft, Save } from 'lucide-react';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; heading: string; description: string }) => Promise<void>;
  initialData: CompanyTimeline | null;
  loading: boolean;
}

export function MilestoneModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
}: MilestoneModalProps) {
  const [date, setDate] = useState('');
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Synchronize form state with initialData (Add vs Edit mode)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date);
        setHeading(initialData.heading);
        setDescription(initialData.description);
      } else {
        setDate('');
        setHeading('');
        setDescription('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!heading.trim()) {
      setError('Heading is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    try {
      await onSave({
        date,
        heading: heading.trim(),
        description: description.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save milestone. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-background rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-up z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {initialData ? 'Edit Milestone' : 'Add New Milestone'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            
            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-200 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Date Field */}
            <div className="space-y-1.5">
              <label htmlFor="milestone-date" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Milestone Date</span>
              </label>
              <input
                id="milestone-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={loading}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground cursor-pointer"
              />
            </div>

            {/* Heading Field */}
            <div className="space-y-1.5">
              <label htmlFor="milestone-heading" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                <span>Milestone Heading</span>
              </label>
              <input
                id="milestone-heading"
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="e.g. Virtual Office Launched"
                required
                disabled={loading}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <label htmlFor="milestone-description" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Milestone Description</span>
              </label>
              <textarea
                id="milestone-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about this event or milestone..."
                required
                disabled={loading}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground resize-none leading-normal font-sans"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end border-t border-border px-6 py-4.5 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-semibold h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1.5 h-9"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Milestone</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
