
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/firebase";
import type { UserProfile } from "@/types";
import { addDoc, collection, serverTimestamp, type FieldValue } from "firebase/firestore";
import { ImagePlus, Loader2, Mic, SendHorizonal } from "lucide-react";
import type { ChangeEvent} from 'react';
import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  currentUser: UserProfile | null;
  chatId?: string;
}

export function MessageInput({ currentUser, chatId = "global_chat" }: MessageInputProps) {
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendMessageToFirestore = async (messageText: string, imageDataUri?: string | null) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return false;
    }

    setIsSending(true);
    let success = false;
    try {
      const messageData: {
        text: string | null;
        imageDataUri?: string;
        voiceUrl: string | null;
        senderId: string;
        senderName: string | null;
        timestamp: FieldValue;
      } = {
        text: messageText.trim() || null,
        voiceUrl: null, // Voice functionality not implemented yet
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
      };

      if (imageDataUri) {
        messageData.imageDataUri = imageDataUri;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
      success = true;
    } catch (error: any) {
      console.error("Error sending message to Firestore:", error);
      let description = "Failed to send message.";
      if (error.message && error.message.includes("INVALID_ARGUMENT") && error.message.includes("document is too large")) {
        description = "Failed to send message: Image is too large for Firestore. Please use a smaller image.";
      } else if (error.code) {
        description = `Failed to send message: ${error.code} - ${error.message}`;
      } else if (error.message) {
        description = `Failed to send message: ${error.message}`;
      }
      toast({ variant: "destructive", title: "Send Error", description });
      success = false;
    } finally {
      setIsSending(false);
      if (success) {
        setText("");
        setImageBase64(null);
        setImageFileName(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    }
    return success;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to send messages." });
      return;
    }
    if (text.trim() === "" && !imageBase64) {
        toast({ variant: "destructive", title: "Empty Message", description: "Cannot send an empty message." });
        return;
    }
    if (isProcessingImage || isSending) return;

    await sendMessageToFirestore(text, imageBase64);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1.5 * 1024 * 1024) { // ~1.5MB limit for original file, Base64 will be larger
        toast({ variant: "destructive", title: "File too large", description: "Image size should ideally be under 1MB for Base64 storage. This might fail." });
        // Allow trying, but warn. Firestore limit is 1MiB for the whole doc.
      }
      setIsProcessingImage(true);
      setImageFileName(file.name);
      try {
        const base64String = await convertFileToBase64(file);
        setImageBase64(base64String);
        console.log("Image converted to Base64 successfully.");
      } catch (error) {
        console.error("Error converting image to Base64:", error);
        toast({ variant: "destructive", title: "Image Error", description: "Could not process image." });
        setImageBase64(null);
        setImageFileName(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
      } finally {
        setIsProcessingImage(false);
      }
    } else {
      setImageBase64(null);
      setImageFileName(null);
    }
  };

  const handleVoiceRecord = () => {
    // Voice recording UI only, not functional
    setIsRecording(!isRecording);
    if(!isRecording) {
        toast({ title: "Voice Recording", description: "Voice recording started (UI only)." });
    } else {
        toast({ title: "Voice Recording", description: "Voice recording stopped (UI only). Message not sent." });
    }
  };
  const [isRecording, setIsRecording] = useState(false); // For UI feedback on voice

  const isCurrentlyProcessing = isProcessingImage || isSending;

  return (
    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-4 border-t bg-card/90 backdrop-blur-sm shadow-t-lg">
      {imageFileName && (
        <div className="mb-2 text-sm text-muted-foreground">
          Selected image: {imageFileName}
          <Button variant="link" size="sm" onClick={() => { setImageBase64(null); setImageFileName(null); if(imageInputRef.current) imageInputRef.current.value = ""; }} className="ml-2 text-destructive" disabled={isCurrentlyProcessing}>Remove</Button>
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
            if (e.key === 'Enter' && !e.shiftKey && !isCurrentlyProcessing) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isCurrentlyProcessing}
        />
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" id="imageUpload" disabled={isCurrentlyProcessing} />
        <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isCurrentlyProcessing} aria-label="Attach image">
          <ImagePlus className="text-muted-foreground hover:text-primary" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={handleVoiceRecord} disabled={isCurrentlyProcessing} aria-label="Record voice message">
          <Mic className={cn("text-muted-foreground hover:text-primary", isRecording && "text-destructive animate-pulse")} />
        </Button>
        <Button type="submit" size="icon" disabled={isCurrentlyProcessing || (text.trim() === "" && !imageBase64)} aria-label="Send message">
          {isProcessingImage ? <Loader2 className="animate-spin" /> : isSending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      {isProcessingImage && <p className="text-xs text-primary mt-1 text-center">Processing image...</p>}
      {isSending && !isProcessingImage && <p className="text-xs text-primary mt-1 text-center">Sending message...</p>}
    </form>
  );
}
