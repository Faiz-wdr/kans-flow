'use client';

import React, { createContext, useContext } from 'react';
import type { StaffProfile } from '@/types';

interface ProfileContextType {
  profile: StaffProfile | null;
}

const ProfileContext = createContext<ProfileContextType>({ profile: null });

export function ProfileProvider({
  profile,
  children,
}: {
  profile: StaffProfile | null;
  children: React.ReactNode;
}) {
  return (
    <ProfileContext.Provider value={{ profile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context.profile;
}
