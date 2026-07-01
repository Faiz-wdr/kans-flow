'use client';

import React, { useState } from 'react';
import type { CompanyTimeline } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HorizontalTimelineProps {
  milestones: CompanyTimeline[];
  selectedMilestoneId?: string;
  onMilestoneClick: (milestone: CompanyTimeline) => void;
  onEdit: (milestone: CompanyTimeline) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function HorizontalTimeline({
  milestones,
  selectedMilestoneId,
  onMilestoneClick,
  onEdit,
  onDelete,
  loading,
}: HorizontalTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (milestones.length === 0) {
    return null;
  }

  // Segment milestones into rows of 3 columns
  const columnsPerRow = 3;
  const rows: (CompanyTimeline | null)[][] = [];
  for (let i = 0; i < milestones.length; i += columnsPerRow) {
    const chunk: (CompanyTimeline | null)[] = milestones.slice(i, i + columnsPerRow);
    while (chunk.length < columnsPerRow) {
      chunk.push(null);
    }
    rows.push(chunk);
  }

  return (
    <div
      className="relative w-full rounded-xl border border-border bg-card p-12 overflow-x-auto select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Snake grid wrapper */}
      <div className="max-w-4xl mx-auto flex flex-col gap-y-24">
        {rows.map((chunk, rIndex) => {
          // If odd row, reverse columns visually so flow wraps back
          const isOddRow = rIndex % 2 === 1;
          const displayChunk = isOddRow ? [...chunk].reverse() : chunk;

          return (
            <div
              key={rIndex}
              className="relative flex gap-16 justify-center items-stretch"
            >
              {displayChunk.map((m, cIndex) => {
                if (m === null) {
                  // Placeholder for empty grid column to maintain alignment
                  return <div key={`empty-${cIndex}`} className="w-[220px] shrink-0" />;
                }

                const actualIndex = milestones.indexOf(m as CompanyTimeline);
                const isSelected = m.id === selectedMilestoneId;

                // Determine connections
                const nextMilestoneExists = actualIndex + 1 < milestones.length;
                const isLastColInEvenRow = !isOddRow && cIndex === 2;
                const isLastColInOddRow = isOddRow && cIndex === 0;

                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setHoveredIndex(actualIndex)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="relative flex flex-col items-center w-[220px] text-center z-10 group"
                  >
                    {/* Horizontal Line Connection: Within the same row */}
                    {nextMilestoneExists && !isLastColInEvenRow && !isLastColInOddRow && (
                      <div
                        className={cn(
                          "absolute top-6 h-1 -translate-y-1/2 z-0 transition-all duration-300",
                          // For even rows, line starts at right edge of node A circle and extends right to node B left edge
                          !isOddRow
                            ? cn(
                                "left-[calc(50%+1.5rem)] w-[calc(100%+1rem)]",
                                hoveredIndex === actualIndex
                                  ? "bg-gradient-to-r from-primary via-border to-border"
                                  : hoveredIndex === actualIndex + 1
                                  ? "bg-gradient-to-r from-border via-border to-primary"
                                  : "bg-border"
                              )
                            // For odd rows, line starts at left edge of node A circle and extends left to node B right edge
                            : cn(
                                "right-[calc(50%+1.5rem)] w-[calc(100%+1rem)]",
                                hoveredIndex === actualIndex
                                  ? "bg-gradient-to-l from-primary via-border to-border"
                                  : hoveredIndex === actualIndex + 1
                                  ? "bg-gradient-to-l from-border via-border to-primary"
                                  : "bg-border"
                              )
                        )}
                      />
                    )}

                    {/* Vertical Snake Curve Right: Connects even row end to odd row start */}
                    {nextMilestoneExists && isLastColInEvenRow && (
                      <div
                        className={cn(
                          "absolute top-6 left-[calc(50%+1.5rem)] w-[calc(50%+2.5rem)] h-[calc(100%+6rem)] border-t-4 border-r-4 border-b-4 rounded-r-[40px] z-0 pointer-events-none transition-all duration-300",
                          hoveredIndex === actualIndex || hoveredIndex === actualIndex + 1
                            ? "border-primary"
                            : "border-border"
                        )}
                      />
                    )}

                    {/* Vertical Snake Curve Left: Connects odd row end to even row start */}
                    {nextMilestoneExists && isLastColInOddRow && (
                      <div
                        className={cn(
                          "absolute top-6 right-[calc(50%+1.5rem)] w-[calc(50%+2.5rem)] h-[calc(100%+6rem)] border-t-4 border-l-4 border-b-4 rounded-l-[40px] z-0 pointer-events-none transition-all duration-300",
                          hoveredIndex === actualIndex || hoveredIndex === actualIndex + 1
                            ? "border-primary"
                            : "border-border"
                        )}
                      />
                    )}

                    {/* Node Circle with Outline & Index Label (reversed so 01 is oldest, reduced to 2px grey border) */}
                    <div
                      onClick={() => onMilestoneClick(m)}
                      className={cn(
                        "relative w-12 h-12 rounded-full border-2 flex items-center justify-center font-serif font-black text-sm z-10 transition-all duration-300 shadow-md cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground scale-110 shadow-primary/20 ring-4 ring-primary/20"
                          : "border-border bg-card text-foreground hover:text-primary"
                      )}
                    >
                      {(milestones.length - actualIndex).toString().padStart(2, '0')}
                    </div>

                    {/* Timeline Date below Node */}
                    <div className="mt-2.5 text-[10px] font-bold text-muted-foreground tracking-wider uppercase z-10 bg-card px-1 transition-all duration-300 group-hover:text-primary select-none">
                      {formatDate(m.date)}
                    </div>

                    {/* Timeline Card: Expands Inline on click */}
                    <div
                      className={cn(
                        "mt-4 p-4 rounded-xl border w-full transition-all duration-300 text-left cursor-pointer z-10",
                        isSelected
                          ? "border-primary bg-primary/[0.02] shadow-md ring-1 ring-primary/10"
                          : "border-border bg-card shadow-xs hover:border-primary/30"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneClick(m);
                      }}
                    >
                      {/* Heading in theme orange color by default */}
                      <h4 className="text-xs font-bold leading-snug text-primary transition-colors">
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
          );
        })}
      </div>
    </div>
  );
}
