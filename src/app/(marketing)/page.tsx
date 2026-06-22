import React from 'react';
import Link from 'next/link';

export default function MarketingPage() {
  return (
    <div className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/20">
              Introducing KANs Flow
            </span>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Modern Workspace Operations Platform
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            A lightweight, operational system for Coworking Spaces, Study Spaces, and Virtual Offices. Seamless onboarding, seat layouts, and support requests.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/membership"
              className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all"
            >
              Apply for Space
            </Link>
            <Link href="/support" className="text-sm font-semibold leading-6 text-foreground hover:text-foreground/80 transition-colors">
              Submit Support Ticket <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="rounded-xl bg-muted p-2 ring-1 ring-inset ring-border lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="w-[500px] h-[300px] rounded-md bg-background border border-border flex flex-col justify-between p-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-destructive" />
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">dashboard.kansflow.com</span>
                </div>
                <div className="flex-1 flex flex-col justify-center text-center py-6">
                  <h3 className="text-sm font-medium text-foreground">Operational Overview</h3>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Occupancy</p>
                      <p className="text-lg font-bold text-foreground">84%</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Available Seats</p>
                      <p className="text-lg font-bold text-foreground">16</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Open Tickets</p>
                      <p className="text-lg font-bold text-destructive">4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
