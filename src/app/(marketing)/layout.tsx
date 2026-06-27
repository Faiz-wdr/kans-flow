'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShieldCheck, ArrowRight } from 'lucide-react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary text-xl">
            <span>KANs Flow</span>
          </Link>

          {/* Desktop Navigation (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/membership" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Apply Membership
            </Link>
            <Link href="/support" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Submit Ticket
            </Link>
            <Link href="/support?category=vacate" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Vacate Notice
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Operator Portal</span>
            </Link>
          </nav>

          {/* Mobile Hamburger Toggle Button (Visible on mobile/tablet) */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs"
            >
              Portal
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3 animate-fade-in shadow-lg">
            <Link
              href="/membership"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Apply Membership
            </Link>
            <Link
              href="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Submit Ticket
            </Link>
            <Link
              href="/support?category=vacate"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Vacate Notice
            </Link>
          </div>
        )}
      </header>

      {/* Main Stream Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} KANs HUB. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
