
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/firebase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { deleteDoc, doc } from "firebase/firestore";
import { Loader2, Trash2, Download } from "lucide-react";
import Image from "next/image";
import React, { useState, useCallback } from "react";

interface ChatMessageProps {
  message: Message;
  currentUser: UserProfile | null;
}

// Define the component logic
function ChatMessageComponent({ message, currentUser }: ChatMessageProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);

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

  const handleDownloadImage = () => {
    if (!imageModalSrc) return;
    const link = document.createElement('a');
    link.href = imageModalSrc;
    const extension = imageModalSrc.split(';')[0].split('/')[1] || 'png';
    const filename = `chat-image-${message.id}.${extension}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Downloading...", description: "Your image will be downloaded." });
  };

  return (
    <>
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
                    setImageModalSrc(message.imageDataUri!);
                    setShowImageModal(true);
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
            <AvatarFallback>{getInitials(currentUser?.displayName)}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {imageModalSrc && (
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl p-4">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 mt-2">
              <img
                src={imageModalSrc}
                alt="Full image preview"
                className="rounded-md"
                style={{
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  display: 'block',
                  margin: 'auto',
                }}
              />
              <Button
                onClick={handleDownloadImage}
                variant="outline"
                className="mt-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Memoize the component
export const ChatMessage = React.memo(ChatMessageComponent);
ChatMessage.displayName = 'ChatMessage';
