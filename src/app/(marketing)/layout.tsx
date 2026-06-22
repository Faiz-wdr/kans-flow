import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-primary">KANs Flow</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/membership" className="text-sm font-medium hover:text-primary/80 transition-colors">
              Apply Membership
            </Link>
            <Link href="/support" className="text-sm font-medium hover:text-primary/80 transition-colors">
              Submit Ticket
            </Link>
            <Link href="/support?category=vacate" className="text-sm font-medium hover:text-primary/80 transition-colors">
              Vacate Notice
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} KANs HUB. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
