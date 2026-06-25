import React from 'react';
import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="border-b border-border bg-background py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
            KANs Flow
          </Link>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
            Public Form
          </span>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="mx-auto w-full max-w-2xl">
          {children}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border mt-auto">
        <p>Powered by KANs Flow &amp; KANs HUB</p>
      </footer>
    </div>
  );
}
