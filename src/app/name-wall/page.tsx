'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, AlertTriangle, XCircle, RefreshCw, Layers } from 'lucide-react';

interface VirtualOfficeCompany {
  id: string;
  suiteNo: string;
  companyName: string;
  industry: string;
  poc: string;
  gstin: string;
  companyLogoUrl: string | null;
  statusBadge: 'Active' | 'Expiring Soon' | 'Expired';
  remainingDaysText: string;
  remainingDaysCount: number;
  createdAt: string;
}

export default function DigitalNameBoardPage() {
  const [companies, setCompanies] = useState<VirtualOfficeCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const supabase = createClient();

  // Live ticking clock (seconds update)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).toUpperCase()
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Virtual Office company records from Supabase
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching name wall data:', error);
        return;
      }

      const now = new Date();

      const mapped: VirtualOfficeCompany[] = (data || [])
        .filter((row: any) => {
          const serviceName = row.service || (row.notes ? (() => { try { return JSON.parse(row.notes).service; } catch (e) { return null; } })() : null);
          return serviceName === 'Virtual Office';
        })
        .map((row: any, idx: number) => {
          let notesObj: any = {};
          if (row.notes) {
            try {
              notesObj = JSON.parse(row.notes);
            } catch (e) {}
          }

          const companyName = notesObj.companyName || row.full_name || 'Virtual Office Member';
          const industry = notesObj.natureOfBusiness === 'Other'
            ? (notesObj.natureOfBusinessOther || 'Business Services')
            : (notesObj.natureOfBusiness || 'Business Consulting');
          const poc = row.full_name || notesObj.applicantName || '-';
          const gstin = notesObj.gstin && notesObj.gstin.trim() !== '' ? notesObj.gstin : '-';
          const companyLogoUrl = notesObj.companyLogoUrl || null;
          const suiteNo = notesObj.virtualSuiteNo || `VS100${idx + 1}`;

          // Calculate remaining agreement days
          const start = row.start_date ? new Date(row.start_date) : new Date(row.created_at);
          const planName = notesObj.plan || 'Gold';
          const end = new Date(start);
          if (planName.toLowerCase().includes('silver')) {
            end.setFullYear(end.getFullYear() + 1);
          } else {
            end.setFullYear(end.getFullYear() + 2);
          }

          const diffTime = end.getTime() - now.getTime();
          const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let statusBadge: 'Active' | 'Expiring Soon' | 'Expired' = 'Active';
          let remainingDaysText = `${remainingDays} Days`;

          if (remainingDays <= 0) {
            statusBadge = 'Expired';
            remainingDaysText = 'Expired';
          } else if (remainingDays <= 30) {
            statusBadge = 'Expiring Soon';
          }

          return {
            id: row.id,
            suiteNo,
            companyName,
            industry,
            poc,
            gstin,
            companyLogoUrl,
            statusBadge,
            remainingDaysText,
            remainingDaysCount: remainingDays,
            createdAt: row.created_at,
          };
        });

      setCompanies(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to update name board:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch + 60s auto-refresh polling + Supabase Realtime synchronization
  useEffect(() => {
    fetchCompanies();

    // 60-second polling fallback
    const pollInterval = setInterval(() => {
      fetchCompanies();
    }, 60000);

    // Supabase Realtime subscription
    const channel = supabase
      .channel('public:onboarding_requests:name-wall')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'onboarding_requests' },
        () => {
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchCompanies, supabase]);

  // Helper to extract company initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white font-sans selection:bg-[#FD7A17] selection:text-black flex flex-col justify-between overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="border-b border-[#1c1c1c] bg-[#101010] px-6 py-4 md:px-10 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wide text-[#FD7A17] font-sans">
              KANs HUB
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 font-normal mt-0.5 tracking-wide font-sans">
              16/959, 1st Floor &bull; City Tower, Wandoor – 679328 &bull; Malappuram District, Kerala
            </p>
          </div>
        </div>

        {/* Compact Live Clock */}
        <div className="flex items-center gap-4 self-start md:self-auto border-t md:border-t-0 md:border-l border-[#222222] pt-2 md:pt-0 md:pl-6 font-sans">
          <div className="text-right">
            <div className="text-sm md:text-base font-bold text-white tracking-wide">
              {currentTime || '--:--:-- --'}
            </div>
            <div className="text-[11px] font-medium text-[#FD7A17] tracking-wide mt-0.5">
              {currentDate || 'Loading Date...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 px-4 py-6 md:px-10 md:py-8 max-w-[1920px] mx-auto w-full font-sans">
        {loading && companies.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-neutral-500 gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-[#FD7A17]" />
            <p className="text-xs tracking-wide font-medium">Synchronizing Display Board...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-neutral-500 border border-dashed border-[#222222] rounded-2xl bg-[#101010] p-8 text-center font-sans">
            <Layers className="h-10 w-10 text-neutral-600 mb-3" />
            <h3 className="text-base font-bold text-neutral-300">No Active Virtual Offices Found</h3>
            <p className="text-xs text-neutral-500 max-w-md mt-1">
              Virtual Office registrations will automatically appear live on this display wall upon application approval.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / TV Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-[#1c1c1c] bg-[#101010] shadow-xl">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#222222] bg-[#141414] text-xs font-bold uppercase tracking-wider text-neutral-400">
                    <th className="py-3.5 px-6 w-36">Suite No.</th>
                    <th className="py-3.5 px-6 w-20 text-center">Logo</th>
                    <th className="py-3.5 px-6">Company</th>
                    <th className="py-3.5 px-6">Industry</th>
                    <th className="py-3.5 px-6">POC</th>
                    <th className="py-3.5 px-6 w-44">GSTIN</th>
                    <th className="py-3.5 px-6 w-36 text-center">Status</th>
                    <th className="py-3.5 px-6 w-40 text-right">Validity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c1c]">
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-[#151515] transition-colors duration-150 group"
                    >
                      {/* Virtual Suite No. */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-neutral-300 text-sm tracking-wide">
                          {company.suiteNo}
                        </span>
                      </td>

                      {/* Company Logo / Initials Avatar */}
                      <td className="py-4 px-6 text-center">
                        <div className="h-9 w-9 rounded-full bg-[#161616] border border-[#242424] flex items-center justify-center overflow-hidden mx-auto shadow-xs">
                          {company.companyLogoUrl ? (
                            <img
                              src={company.companyLogoUrl}
                              alt={company.companyName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-[#FD7A17] tracking-wider">
                              {getInitials(company.companyName)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company Name */}
                      <td className="py-4 px-6">
                        <div className="text-base font-bold text-white tracking-wide group-hover:text-[#FD7A17] transition-colors">
                          {company.companyName}
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="py-4 px-6 text-sm text-neutral-300 font-medium">
                        {company.industry}
                      </td>

                      {/* POC (Point of Contact) */}
                      <td className="py-4 px-6 text-sm text-neutral-300 font-medium">
                        {company.poc}
                      </td>

                      {/* GSTIN */}
                      <td className="py-4 px-6 text-sm text-neutral-400">
                        {company.gstin}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 text-center">
                        {company.statusBadge === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold tracking-wide">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Active</span>
                          </span>
                        )}
                        {company.statusBadge === 'Expiring Soon' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FD7A17]/15 text-[#FD7A17] border border-[#FD7A17]/30 text-[11px] font-semibold tracking-wide">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Expiring Soon</span>
                          </span>
                        )}
                        {company.statusBadge === 'Expired' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-semibold tracking-wide">
                            <XCircle className="h-3 w-3 shrink-0" />
                            <span>Expired</span>
                          </span>
                        )}
                      </td>

                      {/* Remaining Days */}
                      <td className="py-4 px-6 text-right font-medium text-sm text-neutral-300">
                        {company.remainingDaysText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden font-sans">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-xl border border-[#1c1c1c] bg-[#101010] p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-300 text-xs tracking-wide">
                      {company.suiteNo}
                    </span>
                    {company.statusBadge === 'Active' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        Active
                      </span>
                    )}
                    {company.statusBadge === 'Expiring Soon' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FD7A17]/15 text-[#FD7A17] border border-[#FD7A17]/30 text-[10px] font-semibold">
                        Expiring Soon
                      </span>
                    )}
                    {company.statusBadge === 'Expired' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="h-9 w-9 rounded-full bg-[#161616] border border-[#242424] flex items-center justify-center overflow-hidden shrink-0">
                      {company.companyLogoUrl ? (
                        <img src={company.companyLogoUrl} alt={company.companyName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-[#FD7A17]">{getInitials(company.companyName)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">{company.companyName}</h3>
                      <p className="text-xs text-neutral-400">{company.industry}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1c1c1c] text-xs text-neutral-400">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase font-medium">POC</span>
                      <span className="text-neutral-300 font-semibold truncate block">{company.poc}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase font-medium">GSTIN</span>
                      <span className="text-neutral-300 font-semibold">{company.gstin}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-neutral-500 uppercase font-medium">Validity</span>
                      <span className="text-neutral-300 font-medium">{company.remainingDaysText}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Display Footer */}
      <footer className="border-t border-[#1c1c1c] bg-[#101010] px-6 py-3 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 font-sans">
        <div className="flex items-center gap-2">
          <span>KANs HUB Official Virtual Office Information Display System</span>
        </div>
        <div>
          <span>Last Synced: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
