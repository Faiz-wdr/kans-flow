import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  MapPin,
  Users,
  LifeBuoy,
  Bell,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="relative isolate overflow-hidden bg-background pt-4 sm:pt-8 pb-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ================= HERO SECTION (CENTER ALIGNED & CLEAN) ================= */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto pt-4 sm:pt-8">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20 backdrop-blur-md mb-4 sm:mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Introducing KANs Flow 2.0</span>
          </div>

          {/* Main Title (Clean solid color, no green gradient) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-sans leading-[1.15] px-2">
            Modern Workspace Operations Platform
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg leading-relaxed text-muted-foreground max-w-2xl px-2">
            A unified operational ecosystem for Coworking Spaces, Study Centers, and Private Cabins. Seamless member onboarding, real-time visual desk allocation, and instant support tracking.
          </p>

          {/* CTA Action Buttons (Clean by default, subtle shadow on hover only) */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/membership"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all flex items-center justify-center gap-2"
            >
              <span>Apply for Space</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/support"
              className="rounded-xl bg-card border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 hover:border-foreground/20 hover:shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Submit Support Ticket</span>
            </Link>
            <Link
              href="/login"
              className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Operator Portal</span>
            </Link>
          </div>
        </div>

        {/* ================= REAL DASHBOARD PREVIEW ================= */}
        <div className="mt-10 sm:mt-16 mx-auto max-w-6xl">
          <div className="relative rounded-xl sm:rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            
            {/* Window Top Chrome Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3 text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500/80 block" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80 block" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80 block" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-background/80 border border-border px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono text-muted-foreground max-w-[180px] sm:max-w-none truncate">
                <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">dashboard.kansflow.com</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ● Live
                </span>
              </div>
            </div>

            {/* Dashboard Shell Simulation */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px] text-left">
              
              {/* Left Sidebar */}
              <div className="hidden lg:flex lg:col-span-2 border-r border-border bg-muted/20 p-4 flex-col justify-between text-xs font-sans">
                <div className="space-y-4">
                  <div className="font-bold text-primary text-sm tracking-tight flex items-center gap-1.5 pb-2 border-b border-border">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>KANs HUB</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span>Overview</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Seat Layout</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                      <Users className="h-3.5 w-3.5" />
                      <span>Clients</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                      <LifeBuoy className="h-3.5 w-3.5" />
                      <span>Support</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Main Operator</p>
                  <p className="text-[10px]">Admin Portal Active</p>
                </div>
              </div>

              {/* Main Workspace Area */}
              <div className="col-span-12 lg:col-span-10 p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 bg-background/50">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Workspace Operations Portal</h2>
                    <p className="text-xs text-muted-foreground">Live operational stream for KANs HUB Main Center</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                      <input
                        type="text"
                        readOnly
                        placeholder="Search desks..."
                        className="h-7.5 pl-8 pr-2 text-xs rounded-lg border border-input bg-background w-full sm:w-36 focus:outline-hidden"
                      />
                    </div>
                    <div className="relative p-1.5 rounded-lg border border-border bg-card text-foreground shrink-0">
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>

                {/* Real Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Occupancy</p>
                    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-foreground font-serif">84%</p>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">+3% this week</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Free Desks</p>
                    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-foreground font-serif">16</p>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">Across all floors</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Onboarding</p>
                    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-primary font-serif">4 Req</p>
                    <span className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending desk</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tickets</p>
                    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-rose-500 font-serif">2 Open</p>
                    <span className="text-[9px] sm:text-[10px] text-rose-500 font-medium">Active operational</span>
                  </div>
                </div>

                {/* Split Responsive Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Left: Desk Layout Preview */}
                  <div className="lg:col-span-7 rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">Desk Layout Map</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Floor 1</span>
                    </div>

                    <div className="space-y-3 overflow-x-auto pb-1">
                      <div className="min-w-[280px]">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Study Desks (SS1 - SS10)</p>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-[10px] font-bold font-sans">
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS1</span>
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS2</span>
                          <span className="h-7 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 flex items-center justify-center">SS3</span>
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS4</span>
                          <span className="h-7 rounded border border-yellow-600 bg-yellow-500 text-white flex items-center justify-center">SS5</span>
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS6</span>
                          <span className="h-7 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 flex items-center justify-center">SS7</span>
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS8</span>
                          <span className="h-7 rounded border border-amber-300 dark:border-amber-900 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center">SS9</span>
                          <span className="h-7 rounded border border-orange-600 bg-orange-500 text-white flex items-center justify-center">SS10</span>
                        </div>
                      </div>

                      <div className="min-w-[280px]">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Private Business Cabins</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold font-sans">
                          <div className="p-2 rounded border border-orange-600 bg-orange-500 text-white flex flex-col items-center justify-center">
                            <span>Cabin C1</span>
                            <span className="text-[9px] opacity-90 font-normal">TechCorp</span>
                          </div>
                          <div className="p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 flex flex-col items-center justify-center">
                            <span>Cabin C2</span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Available</span>
                          </div>
                          <div className="p-2 rounded border border-orange-600 bg-orange-500 text-white flex flex-col items-center justify-center">
                            <span>Cabin C3</span>
                            <span className="text-[9px] opacity-90 font-normal">Innovate Studio</span>
                          </div>
                          <div className="p-2 rounded border border-yellow-600 bg-yellow-500 text-white flex flex-col items-center justify-center">
                            <span>Cabin C4</span>
                            <span className="text-[9px] opacity-90 font-normal">Vacating 3d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Queue Stream */}
                  <div className="lg:col-span-5 rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">Live Queue</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">4 Pending</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">Rahul Sharma</p>
                          <p className="text-[10px] text-muted-foreground truncate">Coworking Desk • Verified</p>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                          Approve
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                            <LifeBuoy className="h-3 w-3 shrink-0" />
                            <span className="truncate">WiFi Access Issue</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">Cabin C3 • High Priority</p>
                        </div>
                        <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-1 rounded shrink-0">
                          Active
                        </span>
                      </div>
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
