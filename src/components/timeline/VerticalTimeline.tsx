'use client';

import React from 'react';
import type { CompanyTimeline } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VerticalTimelineProps {
  milestones: CompanyTimeline[];
  selectedMilestoneId?: string;
  onMilestoneClick: (milestone: CompanyTimeline) => void;
  onEdit: (milestone: CompanyTimeline) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function VerticalTimeline({
  milestones,
  selectedMilestoneId,
  onMilestoneClick,
  onEdit,
  onDelete,
  loading,
}: VerticalTimelineProps) {
  if (milestones.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative w-full rounded-xl border border-border bg-card p-6 select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Vertical line running down the timeline */}
      <div className="relative border-l-2 border-muted pl-8 ml-4 space-y-8 py-2">
        {milestones.map((m, index) => {
          const isSelected = m.id === selectedMilestoneId;

          return (
            <div
              key={m.id}
              className="relative group"
            >
              {/* Node Circle with Index Label inside (reversed so 01 is oldest, reduced to 2px grey border) */}
              <div
                onClick={() => onMilestoneClick(m)}
                className={cn(
                  "absolute -left-[45px] top-1.5 w-8 h-8 rounded-full border-2 flex items-center justify-center font-serif font-black text-xs transition-all duration-300 shadow-sm cursor-pointer z-10",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground scale-110 shadow-primary/20 ring-4 ring-primary/20"
                    : "border-border bg-card text-foreground hover:text-primary"
                )}
              >
                {(milestones.length - index).toString().padStart(2, '0')}
              </div>

              {/* Card Container: Expands Inline on click */}
              <div
                onClick={() => onMilestoneClick(m)}
                className={cn(
                  "p-4 rounded-xl border w-full transition-all duration-300 text-left cursor-pointer z-10",
                  isSelected
                    ? "border-primary bg-primary/[0.02] shadow-md ring-1 ring-primary/10"
                    : "border-border bg-card shadow-xs hover:border-primary/30"
                )}
              >
                <div className="mb-1 select-none">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {formatDate(m.date)}
                  </span>
                </div>

                {/* Heading in theme orange color by default */}
                <h4 className="text-sm font-bold leading-snug text-primary transition-colors">
                  {m.heading}
                </h4>

                {/* Expandable Details Container */}
                <div
                  className={cn(
                    "transition-all duration-300 overflow-hidden text-xs",
                    isSelected ? "max-h-[500px] opacity-100 mt-3 pt-3 border-t border-border" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
                    {m.description}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-border/40 select-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(m);
                      }}
                      disabled={loading}
                      className="px-2.5 py-1.5 rounded border border-border bg-card hover:bg-muted text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(m.id);
                      }}
                      disabled={loading}
                      className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-950/30 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
