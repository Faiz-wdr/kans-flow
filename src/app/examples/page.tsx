import React from 'react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { serverAuth } from '@/lib/supabase/auth-server';
import { getSeats, updateSeat } from '@/services/db/seats';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. EXAMPLE SERVER ACTION (MUTATIONS)
// ==========================================
async function toggleSeatStatusAction(formData: FormData) {
  'use server';
  
  const seatId = formData.get('seatId') as string;
  const currentStatus = formData.get('currentStatus') as string;
  const newStatus = currentStatus === 'available' ? 'occupied' : 'available';

  const supabase = await createServerClient();
  const { error } = await updateSeat(supabase, seatId, { status: newStatus as any });

  if (error) {
    console.error('Failed to update seat:', error);
  } else {
    revalidatePath('/examples');
  }
}

// ==========================================
// 2. MAIN SERVER COMPONENT
// ==========================================
export default async function ExamplesPage() {
  // Get active session profile
  const profile = await serverAuth.getUserProfile();
  
  const supabase = await createServerClient();
  
  // Try fetching seats for profile organization, default to a placeholder UUID for demonstration
  const orgId = profile?.organizationId || '00000000-0000-0000-0000-000000000000';
  const { data: seats } = await getSeats(supabase, orgId);

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-12 bg-background text-foreground min-h-screen font-sans">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Supabase Integration Guide</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Usage blueprints for KANs Flow App Router components.
        </p>
      </div>

      {/* Profile Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-3">
          1. Server-Side Session Checking
        </h2>
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          {profile ? (
            <div className="space-y-1">
              <p className="font-semibold text-sm">Authenticated User Profile Details:</p>
              <p className="text-xs text-muted-foreground">ID: {profile.id}</p>
              <p className="text-xs text-muted-foreground">Name: {profile.fullName}</p>
              <p className="text-xs text-muted-foreground">Role: {profile.role}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">No active server session. Showing Guest state.</p>
              <p className="text-xs text-muted-foreground mt-1">
                To login, visit <a href="/login" className="underline text-primary">/login</a>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Seats Management (Server Action Example) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-3">
          2. Fetching &amp; Server Actions (Mutations)
        </h2>
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-4">
            Below items list real seats queried from database for organization ID: <code>{orgId}</code>.
          </p>

          {seats && seats.length > 0 ? (
            <div className="divide-y divide-border">
              {seats.map((seat) => (
                <div key={seat.id} className="flex justify-between items-center py-3">
                  <div>
                    <span className="text-sm font-semibold">{seat.name}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded ml-2">
                      {seat.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      seat.status === 'available' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`} />
                    <form action={toggleSeatStatusAction}>
                      <input type="hidden" name="seatId" value={seat.id} />
                      <input type="hidden" name="currentStatus" value={seat.status} />
                      <Button variant="outline" size="sm" type="submit">
                        Toggle Status
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No active seat nodes configured for this branch.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
