"use client";

import type { Message, UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import Image from "next/image";
import { FileText, Mic, PlayCircle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  currentUser: UserProfile | null;
}

export function ChatMessage({ message, currentUser }: ChatMessageProps) {
  const isCurrentUserMessage = message.senderId === currentUser?.uid;

  const getInitials = (name: string | null | undefined) => {
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
    : new Date(); // Fallback to now if timestamp is invalid

  return (
    <div className={cn("flex gap-3 my-4", isCurrentUserMessage ? "justify-end" : "justify-start")}>
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={undefined} alt={message.senderName || "User"} />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md",
          isCurrentUserMessage
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {!isCurrentUserMessage && (
          <p className="text-xs font-semibold mb-1 text-accent">{message.senderName || "Anonymous"}</p>
        )}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        {message.imageUrl && (
          <div className="mt-2 relative aspect-video max-w-full overflow-hidden rounded-md">
             <Image 
                src={message.imageUrl} 
                alt="Uploaded image" 
                layout="fill" 
                objectFit="cover"
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.imageUrl, '_blank')}
                data-ai-hint="chat image"
              />
          </div>
        )}
        {message.voiceUrl && ( // Placeholder for voice message UI
          <div className="mt-2 flex items-center gap-2 p-2 bg-background/20 rounded-md">
            <PlayCircle className="w-6 h-6 text-foreground/80" />
            <span className="text-sm text-foreground/80">Voice Message</span>
            {/* Placeholder for duration, e.g., <span className="text-xs text-muted-foreground">0:30</span> */}
          </div>
        )}
        <p className={cn("text-xs mt-2", isCurrentUserMessage ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left")}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
      {isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || "User"} />
          <AvatarFallback>{getInitials(currentUser?.displayName)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
