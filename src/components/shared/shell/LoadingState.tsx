import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function LoadingState({ message = 'Loading workspace data...', className, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[350px] flex-col items-center justify-center p-8 text-center space-y-4 animate-pulse',
        className
      )}
      {...props}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground font-sans">
        {message}
      </p>
    </div>
  );
}
