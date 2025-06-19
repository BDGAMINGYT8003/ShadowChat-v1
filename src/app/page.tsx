
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthenticationPage() {
  const { loading, initialLoadComplete, currentUser } = useAuth();

  // Wait until initial auth check is complete
  if (!initialLoadComplete || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, AuthProvider's redirect effect will navigate to /chat.
  // Show a loader here to prevent AuthForm from flashing.
  if (currentUser) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If initial check is complete, loading is false, and there's no current user, show AuthForm.
  return <AuthForm />;
}

