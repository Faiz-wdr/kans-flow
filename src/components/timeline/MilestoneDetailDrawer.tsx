'use client';

import React from 'react';
import type { CompanyTimeline } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Calendar, Edit3, Trash2 } from 'lucide-react';

interface MilestoneDetailCardProps {
  milestone: CompanyTimeline | null;
  onClose: () => void;
  onEdit: (milestone: CompanyTimeline) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function MilestoneDetailCard({
  milestone,
  onClose,
  onEdit,
  onDelete,
  loading = false,
}: MilestoneDetailCardProps) {
  if (!milestone) return null;

  return (
    <div className="relative w-full bg-card border border-border rounded-xl shadow-md p-6 space-y-6 font-sans animate-scale-up">
      
      {/* Top Bar: Date Header & Close Button */}
      <div className="flex items-center justify-between border-b border-border pb-3.5 select-none">
        <div className="flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-primary" />
          <span className="text-sm font-extrabold text-primary uppercase tracking-wider">
            {formatDate(milestone.date)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="space-y-4">
        {/* Large, premium serif milestone heading */}
        <h3 className="text-xl md:text-2xl font-black text-foreground leading-snug font-serif">
          {milestone.heading}
        </h3>

        {/* Milestone Description styled with left vertical accent line */}
        <div className="relative pl-4 border-l-4 border-primary/30 py-1 bg-muted/5 rounded-r-lg pr-4">
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {milestone.description}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Operations */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit(milestone)}
            disabled={loading}
            className="flex-1 sm:flex-initial text-xs font-bold inline-flex items-center justify-center gap-1.5 h-9 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Edit Details</span>
          </Button>

          <Button
            type="button"
            disabled={loading}
            onClick={() => onDelete(milestone.id)}
            className="flex-1 sm:flex-initial text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-200 dark:border-rose-950/30 dark:text-rose-400 h-9 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Milestone</span>
          </Button>
        </div>

        {/* Close Button */}
        <Button
          type="button"
          variant="outline"
          className="text-xs font-semibold h-9 sm:w-24 w-full"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
