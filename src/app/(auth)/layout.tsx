import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 font-sans text-foreground px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm sm:p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold tracking-tight text-primary">KANs Flow</span>
        </div>
        {children}
      </div>
    </div>
  );
}
