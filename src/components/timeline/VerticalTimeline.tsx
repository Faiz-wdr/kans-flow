'use client';

import React from 'react';
import type { CompanyTimeline } from '@/types';
import { formatDate } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface VerticalTimelineProps {
  milestones: CompanyTimeline[];
  selectedMilestoneId?: string;
  onMilestoneClick: (milestone: CompanyTimeline) => void;
}

export function VerticalTimeline({
  milestones,
  selectedMilestoneId,
  onMilestoneClick,
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
      <div className="relative border-l-2 border-muted pl-6 ml-4 space-y-6 py-2">
        {milestones.map((m) => {
          const isSelected = m.id === selectedMilestoneId;

          return (
            <div
              key={m.id}
              onClick={() => onMilestoneClick(m)}
              className="relative group cursor-pointer"
            >
              {/* Bullet Node Indicator */}
              <div
                className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20'
                    : 'border-border bg-card text-muted-foreground group-hover:border-primary/50 group-hover:text-primary group-hover:scale-105 bg-background'
                }`}
              >
                <Calendar className="h-2.5 w-2.5" />
              </div>

              {/* Card Container */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                  isSelected
                    ? 'border-primary/40 bg-primary/[0.03] shadow-sm shadow-primary/5'
                    : 'border-border bg-card shadow-xs group-hover:border-primary/30'
                }`}
              >
                <div className="mb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {formatDate(m.date)}
                  </span>
                </div>
                <h4
                  className={`text-sm font-bold leading-snug transition-colors ${
                    isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {m.heading}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-3 mt-2 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
