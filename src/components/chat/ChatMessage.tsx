
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
          {/* Assuming user profile pictures are not part of this scope yet */}
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
        {message.imageDataUri && (
          <div className="mt-2 relative max-w-full overflow-hidden rounded-md">
             <Image 
                src={message.imageDataUri} 
                alt="Uploaded image"
                width={300} // Provide appropriate width and height, or use layout="fill" with a sized parent
                height={200}
                className="cursor-pointer hover:opacity-90 transition-opacity object-cover"
                onClick={() => {
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`<img src="${message.imageDataUri}" alt="Full image" style="max-width: 100%; max-height: 100vh; display: block; margin: auto;" />`);
                    newWindow.document.title = "Image Preview";
                  }
                }}
                data-ai-hint="chat image content"
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
