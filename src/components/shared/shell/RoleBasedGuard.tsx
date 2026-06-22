'use client';

import React from 'react';
import type { UserRole } from '@/types';
import { EmptyState } from './EmptyState';
import { ShieldAlert } from 'lucide-react';

interface RoleBasedGuardProps {
  allowedRoles: UserRole[];
  userRole: UserRole | undefined;
  children: React.ReactNode;
}

export function RoleBasedGuard({ allowedRoles, userRole, children }: RoleBasedGuardProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
        <EmptyState
          title="Access Denied"
          description="You do not have the required permissions to view this section. Please contact your workspace administrator if you believe this is an error."
          icon={ShieldAlert}
        />
      </div>
    );
  }

  return <>{children}</>;
}
