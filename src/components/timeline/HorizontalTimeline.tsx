'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { CompanyTimeline } from '@/types';
import { formatDate } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalTimelineProps {
  milestones: CompanyTimeline[];
  selectedMilestoneId?: string;
  onMilestoneClick: (milestone: CompanyTimeline) => void;
}

export function HorizontalTimeline({
  milestones,
  selectedMilestoneId,
  onMilestoneClick,
}: HorizontalTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  
  // Track hovered node index to highlight adjacent line segments
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Scroll to the latest milestone (far right end) on mount or milestones change
  useEffect(() => {
    if (milestones.length === 0) return;
    
    const scrollTimeout = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = containerRef.current.scrollWidth;
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [milestones]);

  if (milestones.length === 0) {
    return null;
  }

  // Drag Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    setHasDragged(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    
    if (Math.abs(x - startX) > 5) {
      setHasDragged(true);
    }
    
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMilestoneClick = (milestone: CompanyTimeline) => {
    if (!hasDragged) {
      onMilestoneClick(milestone);
    }
  };

  return (
    <div 
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-8 select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Scrollable timeline container with drag classes & mouse handlers */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative overflow-x-auto pb-6 pt-10 scrollbar-none scrollbar-track-transparent select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="relative flex gap-16 min-w-max px-8">
          
          {milestones.map((m, index) => {
            const isSelected = m.id === selectedMilestoneId;
            return (
              <div
                key={m.id}
                onClick={() => handleMilestoneClick(m)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative flex flex-col items-center w-[220px] text-center z-10 group cursor-pointer"
              >
                {/* Connecting Line Segment (starts from center of current node to center of next node) */}
                {index < milestones.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-6 left-1/2 w-[calc(100%+4rem)] h-1 -translate-y-1/2 z-0 transition-all duration-300",
                      hoveredIndex === index
                        ? "bg-gradient-to-r from-primary via-border to-border"
                        : hoveredIndex === index + 1
                        ? "bg-gradient-to-r from-border via-border to-primary"
                        : "bg-border"
                    )}
                  />
                )}

                {/* Node Circle */}
                <div
                  className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-md z-10 ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground scale-110 shadow-primary/20 ring-4 ring-primary/20'
                      : 'border-background bg-card text-muted-foreground hover:scale-115 hover:border-primary/20 hover:text-primary ring-2 ring-border hover:ring-primary/40'
                  }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                </div>

                {/* Date underneath the circle */}
                <div className="mt-2 text-[10px] font-bold text-muted-foreground tracking-wider uppercase z-10 bg-card px-1 transition-all duration-300 group-hover:text-primary">
                  {formatDate(m.date)}
                </div>

                {/* Timeline Card */}
                <div
                  className={`mt-4 p-4 rounded-xl border w-full transition-all duration-300 text-left hover:shadow-md ${
                    isSelected
                      ? 'border-primary/40 bg-primary/[0.03] shadow-sm shadow-primary/5'
                      : 'border-border bg-card shadow-xs group-hover:border-primary/30'
                  }`}
                >
                  <h4
                    className={`text-sm font-bold line-clamp-2 leading-snug transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                    }`}
                  >
                    {m.heading}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
