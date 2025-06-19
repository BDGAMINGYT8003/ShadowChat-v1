"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthRedirect() {
  const { currentUser, loading, initialLoadComplete } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialLoadComplete || loading) {
      return; // Wait for auth state to be determined
    }

    const isAuthPage = pathname === '/'; // Assuming '/' is the auth page

    if (currentUser && isAuthPage) {
      router.replace('/chat'); // User is logged in and on auth page, redirect to chat
    } else if (!currentUser && !isAuthPage) {
      router.replace('/'); // User is not logged in and not on auth page, redirect to auth
    }
  }, [currentUser, loading, initialLoadComplete, router, pathname]);
}
