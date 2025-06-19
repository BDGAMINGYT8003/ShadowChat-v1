
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  initialLoadComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data() as UserProfile);
        } else {
          const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || "Anonymous",
          };
          await setDoc(userRef, newUserProfile);
          setCurrentUser(newUserProfile);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
      setInitialLoadComplete(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only redirect once the initial authentication state is fully determined
    if (!initialLoadComplete || loading) {
      return;
    }

    const isAuthPage = pathname === '/';
    if (currentUser && isAuthPage) {
      router.replace('/chat'); // Use replace to avoid back button to auth page
    } else if (!currentUser && !isAuthPage) {
      router.replace('/'); // Use replace
    }
  }, [currentUser, loading, initialLoadComplete, router, pathname]);


  // Show a global loader until the initial auth state (including profile fetch) is resolved.
  if (!initialLoadComplete) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Once initial load is complete, AuthContext is ready.
  // Child components (like AuthenticatedLayout or page.tsx) will handle their own rendering
  // based on the context values (currentUser, loading).
  return (
    <AuthContext.Provider value={{ currentUser, loading, initialLoadComplete }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

