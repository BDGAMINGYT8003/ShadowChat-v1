"use client";

import { auth } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function ChatHeader() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // AuthContext will handle redirect
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Error", description: "Failed to log out. Please try again." });
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-card/80 backdrop-blur-sm shadow-md">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold font-headline text-primary">ShadowChat</h1>
      </div>
      <div className="flex items-center gap-3">
        {currentUser && <span className="text-sm text-muted-foreground">Hi, {currentUser.displayName}</span>}
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
          <LogOut className="w-5 h-5 text-destructive hover:text-destructive/80" />
        </Button>
      </div>
    </header>
  );
}
