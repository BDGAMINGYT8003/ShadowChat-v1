"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthenticationPage() {
  useAuthRedirect();
  const { loading, initialLoadComplete } = useAuth();

  if (loading || !initialLoadComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return <AuthForm />;
}
