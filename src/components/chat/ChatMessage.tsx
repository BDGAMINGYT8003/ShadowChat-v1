
"use client";

import type { Message, UserProfile } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/firebase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { deleteDoc, doc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import React, { useState, useCallback } from "react";

interface ChatMessageProps {
  message: Message;
  currentUser: UserProfile | null;
}

const ChatMessage = React.memo(function ChatMessage({ message, currentUser }: ChatMessageProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCurrentUserMessage = message.senderId === currentUser?.uid;

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const timestamp = message.timestamp && typeof (message.timestamp as any).toDate === 'function' 
    ? (message.timestamp as any).toDate() 
    : message.timestamp instanceof Date
    ? message.timestamp
    : new Date();

  const handleDeleteMessage = useCallback(async () => {
    if (!isCurrentUserMessage || !message.id || !message.chatId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete this message.",
      });
      setShowDeleteConfirm(false); 
      return;
    }
    setIsDeleting(true);
    try {
      const messageRef = doc(db, "chats", message.chatId, "messages", message.id);
      await deleteDoc(messageRef);
      toast({
        title: "Success",
        description: "Message deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete message. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [isCurrentUserMessage, message.id, message.chatId, toast]);

  return (
    <div className={cn("flex gap-3 my-4 group", isCurrentUserMessage ? "justify-end" : "justify-start")}>
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "relative max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md",
          isCurrentUserMessage
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {!isCurrentUserMessage && (
          <p className="text-xs font-semibold mb-1 text-accent">{message.senderName || "Anonymous"}</p>
        )}
        
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        
        {message.imageDataUri && (
          <div className="mt-2 relative max-w-full overflow-hidden rounded-md">
             <Image 
                src={message.imageDataUri} 
                alt="Uploaded image"
                width={300} 
                height={200} 
                className="cursor-pointer hover:opacity-90 transition-opacity object-cover"
                onClick={() => {
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(\`<img src="\${message.imageDataUri}" alt="Full image" style="max-width: 100%; max-height: 100vh; display: block; margin: auto;" />\`);
                    newWindow.document.title = "Image Preview";
                  }
                }}
                data-ai-hint="chat image content"
              />
          </div>
        )}

        <p className={cn("text-xs mt-2", isCurrentUserMessage ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left")}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>

        {isCurrentUserMessage && (
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-0.5 right-0.5 h-6 w-6 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                  isCurrentUserMessage ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/70" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
                aria-label="Delete message"
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your message.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting} onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMessage} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          {currentUser?.photoURL ? (
            <Image src={currentUser.photoURL} alt={currentUser.displayName || "User"} width={32} height={32} className="rounded-full" />
          ) : (
            <AvatarFallback>{getInitials(currentUser?.displayName)}</AvatarFallback>
          )}
        </Avatar>
      )}
    </div>
  );
});

export { ChatMessage };
