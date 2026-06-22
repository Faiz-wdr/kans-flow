import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in pb-16 sm:pb-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
