"use client";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/firebase";
import type { Message } from "@/types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const chatId = "global_chat"; // For a single global chat room

  useEffect(() => {
    if (!currentUser) return;

    setIsLoadingMessages(true);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
      setMessages(newMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setIsLoadingMessages(false);
      // Optionally, show a toast error
    });

    return () => unsubscribe();
  }, [currentUser, chatId]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <ChatHeader />
      <MessageList messages={messages} currentUser={currentUser} isLoading={isLoadingMessages} />
      <MessageInput currentUser={currentUser} chatId={chatId} />
    </div>
  );
}
