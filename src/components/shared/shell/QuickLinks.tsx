'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ClipboardList, Building2, HelpCircle, Copy, Check } from 'lucide-react';

interface QuickLinksProps {
  isCollapsed?: boolean;
}

// Brand SVG logos for external Zoho services
function BiginIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer funnel */}
      <path
        d="M 4 5 L 16 5 L 14 11 L 14 18.5 C 14 19.3 13.3 20 12.5 20 H 11.5 C 10.7 20 10 19.3 10 18.5 L 10 11 L 4 5"
        stroke="#009045"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner/nested funnel */}
      <path
        d="M 10 9 H 20 L 18 13 L 15.5 16.5 M 10.5 9 L 13.5 12.5 L 15 9"
        stroke="#009045"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZohoBooksIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Upper loop of B */}
      <path
        d="M 5 12.5 V 5.5 C 5 4.7 5.7 4 6.5 4 H 14.5 C 17.5 4 19.5 5.5 19.5 8 C 19.5 10 17.5 11 15 11.8 L 5 12.5"
        stroke="#317ec2"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lower loop of B */}
      <path
        d="M 5.5 14 L 17 11.5 C 19 11 19.5 12.5 19.5 14 C 19.5 16.5 17.5 20 14.5 20 H 6.5 C 5.7 20 5 19.3 5 18.5 V 14.5"
        stroke="#317ec2"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Upper eye/circle */}
      <circle cx="10" cy="8" r="1.5" stroke="#317ec2" strokeWidth="2.2" fill="none" />
      {/* Lower eye/circle */}
      <circle cx="14.5" cy="16" r="1.5" stroke="#317ec2" strokeWidth="2.2" fill="none" />
    </svg>
  );
}

function ZohoSocialIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Connections behind */}
      <line x1="8" y1="5" x2="17" y2="8" stroke="#347ab7" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="17" y1="8" x2="8" y2="14" stroke="#13a05a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="14" x2="17" y2="18" stroke="#e03b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Circles */}
      <circle cx="8" cy="5" r="2.2" stroke="#f4b423" strokeWidth="2.2" fill="#fff" />
      <circle cx="17" cy="8" r="3.2" stroke="#347ab7" strokeWidth="2.2" fill="#fff" />
      <circle cx="8" cy="14" r="4.2" stroke="#13a05a" strokeWidth="2.2" fill="#fff" />
      <circle cx="17" cy="18" r="3.2" stroke="#e03b30" strokeWidth="2.2" fill="#fff" />

      {/* Clock hands inside green circle */}
      <path d="M 8 14 V 11.5" stroke="#13a05a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 8 14 L 6 15.8" stroke="#13a05a" strokeWidth="1.8" strokeLinecap="round" />

      {/* Clock hands inside red circle */}
      <path d="M 17 18 V 16" stroke="#e03b30" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 17 18 L 19.2 19.2" stroke="#e03b30" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const quickLinks = [
  {
    name: 'Bigin CRM',
    href: 'https://bigin.zoho.com/',
    isExternal: true,
    icon: BiginIcon,
  },
  {
    name: 'Zoho Books',
    href: 'https://books.zoho.com/',
    isExternal: true,
    icon: ZohoBooksIcon,
  },
  {
    name: 'Zoho Social',
    href: 'https://social.zoho.com/',
    isExternal: true,
    icon: ZohoSocialIcon,
  },
  {
    name: 'Coworking Onboarding',
    href: '/membership',
    isExternal: false,
    icon: ClipboardList,
  },
  {
    name: 'Virtual Office Onboarding',
    href: '/virtual-office',
    isExternal: false,
    icon: Building2,
  },
  {
    name: 'Support Form',
    href: '/support',
    isExternal: false,
    icon: HelpCircle,
  },
];

export function QuickLinks({ isCollapsed = false }: QuickLinksProps) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, item: typeof quickLinks[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = typeof window !== 'undefined' ? window.location.origin + item.href : item.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(item.name);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      {!isCollapsed ? (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none font-sans px-3">
          Quick Links
        </span>
      ) : (
        <div className="border-b border-border/50 my-1 w-full" />
      )}

      <div className={cn('flex flex-col gap-1', isCollapsed && 'items-center')}>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
              {!isCollapsed && <span className="font-sans truncate flex-1 min-w-0">{item.name}</span>}
            </>
          );

          const className = cn(
            'group flex items-center rounded-lg transition-all py-1.5 text-xs font-medium border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full min-w-0',
            isCollapsed ? 'justify-center px-0' : 'px-3 gap-2.5'
          );

          if (item.isExternal) {
            return (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                title={isCollapsed ? item.name : undefined}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={item.name} className="flex items-center justify-between w-full min-w-0 group/row">
              <Link
                href={item.href}
                target="_blank"
                className={className}
                title={isCollapsed ? item.name : undefined}
              >
                {content}
              </Link>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, item)}
                  className="p-1.5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 ml-1 cursor-pointer"
                  title={`Copy form URL for ${item.name}`}
                >
                  {copiedLink === item.name ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 animate-fade-in" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
