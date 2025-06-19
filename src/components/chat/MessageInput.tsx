"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase/firebase";
import type { UserProfile } from "@/types";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, Mic, Paperclip, SendHorizonal } from "lucide-react";
import type { ChangeEvent} from 'react';
import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  currentUser: UserProfile | null;
  chatId?: string; // For potential future multi-chat support, default to global
}

export function MessageInput({ currentUser, chatId = "global_chat" }: MessageInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // UI state for voice recording
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to send messages." });
      return;
    }
    if (text.trim() === "" && !imageFile) return;

    setIsSending(true);
    try {
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        const storageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: text.trim() || null, // Store null if only image
        imageUrl,
        voiceUrl: null, // Placeholder
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
      });

      setText("");
      setImageFile(null);
      if(imageInputRef.current) imageInputRef.current.value = ""; // Clear file input
      toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
    } finally {
      setIsSending(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: "Image size should not exceed 5MB." });
        return;
      }
      setImageFile(file);
    }
  };

  const handleVoiceRecord = () => {
    // Placeholder for voice recording functionality
    setIsRecording(!isRecording);
    if(!isRecording) {
        toast({ title: "Voice Recording", description: "Voice recording started (UI only)." });
    } else {
        toast({ title: "Voice Recording", description: "Voice recording stopped (UI only). Message not sent." });
    }
  };

  return (
    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-4 border-t bg-card/90 backdrop-blur-sm shadow-t-lg">
      {imageFile && (
        <div className="mb-2 text-sm text-muted-foreground">
          Selected image: {imageFile.name} ({ (imageFile.size / 1024).toFixed(1) } KB)
          <Button variant="link" size="sm" onClick={() => { setImageFile(null); if(imageInputRef.current) imageInputRef.current.value = ""; }} className="ml-2 text-destructive">Remove</Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none no-scrollbar min-h-[40px] max-h-[120px] rounded-full px-4 py-2 focus-visible:ring-1 focus-visible:ring-primary"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isSending}
        />
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" id="imageUpload" />
        <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isSending} aria-label="Attach image">
          <ImagePlus className="text-muted-foreground hover:text-primary" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={handleVoiceRecord} disabled={isSending} aria-label="Record voice message">
          <Mic className={cn("text-muted-foreground hover:text-primary", isRecording && "text-destructive animate-pulse")} />
        </Button>
        <Button type="submit" size="icon" disabled={isSending || (text.trim() === "" && !imageFile)} aria-label="Send message">
          {isSending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
    </form>
  );
}
