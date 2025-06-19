"use client";

import type { Message, UserProfile } from "@/types";
import { ChatMessage } from "./ChatMessage";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListProps {
  messages: Message[];
  currentUser: UserProfile | null;
  isLoading: boolean;
}

export function MessageList({ messages, currentUser, isLoading }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex gap-3 my-4 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full self-end" />}
            <div className={`p-3 rounded-xl shadow-md ${i % 2 === 0 ? 'bg-card' : 'bg-primary'}`}>
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full self-end" />}
          </div>
        ))}
      </div>
    );
  }


  return (
    <ScrollArea className="flex-1 p-4 no-scrollbar" ref={scrollAreaRef}>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} currentUser={currentUser} />
      ))}
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
}
