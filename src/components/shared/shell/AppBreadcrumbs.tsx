'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter((s) => s);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-sans">
      <Link href="/" className="hover:text-foreground transition-colors font-medium">
        Home
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isActive = index === segments.length - 1;
        
        // Capitalize segment and clean up hyphens
        const label = segment
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());

        return (
          <React.Fragment key={segment}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            {isActive ? (
              <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link href={url} className="hover:text-foreground transition-colors font-medium truncate max-w-[120px] sm:max-w-none">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
