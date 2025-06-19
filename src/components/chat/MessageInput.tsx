
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/firebase"; // Firestore only, no storage
import type { UserProfile } from "@/types";
import { addDoc, collection, serverTimestamp, type FieldValue } from "firebase/firestore";
import { ImagePlus, Loader2, SendHorizonal } from "lucide-react";
import type { ChangeEvent} from 'react';
import React, { useState, useRef } from "react";

interface MessageInputProps {
  currentUser: UserProfile | null;
  chatId?: string;
}

export function MessageInput({ currentUser, chatId = "global_chat" }: MessageInputProps) {
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null); // Stores the Base64 string
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false); // For converting to Base64
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
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

  const clearImageSelection = () => {
    setImageBase64(null);
    setImageFileName(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Auth Error", description: "You must be logged in to send messages." });
      return;
    }
    if (text.trim() === "" && !imageBase64) {
        toast({ variant: "destructive", title: "Empty Message", description: "Cannot send an empty message or image." });
        return;
    }
    if (isProcessingImage || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      const messageData: {
        text: string | null;
        imageDataUri?: string;
        senderId: string;
        senderName: string | null;
        timestamp: FieldValue;
      } = {
        text: text.trim() || null,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
      };

      if (imageBase64) {
        messageData.imageDataUri = imageBase64;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
      setText("");
      clearImageSelection();
    } catch (error: any) {
      console.error("Firestore Send Error:", error);
      let description = "Failed to send message.";
      if (error.code === 'resource-exhausted' || (error.message && (error.message.includes("document is too large") || error.message.includes("exceeds the maximum size")))) {
        description = "Message (image) is too large. Firestore documents have a 1MB limit. Please use a smaller image.";
      } else if (error.code) {
        description = `Failed to send message: ${error.code} - ${error.message}`;
      } else if (error.message) {
        description = `Failed to send message: ${error.message}`;
      }
      toast({ variant: "destructive", title: "Send Error", description });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Firestore document limit is 1MiB. Base64 encoding adds ~33%.
      // Warn for original files over ~700KB as they might exceed this after encoding.
      if (file.size > 700 * 1024) { 
        toast({ 
          variant: "destructive", 
          title: "Image too large", 
          description: "Selected image might be too large for Firestore (max ~700KB original size). Sending may fail." 
        });
      }
      
      setIsProcessingImage(true);
      setImageFileName(file.name);

      try {
        const base64String = await convertFileToBase64(file);
        setImageBase64(base64String);
      } catch (error) {
        console.error("Error converting image to Base64:", error);
        setImageBase64(null);
        setImageFileName(null);
        toast({ variant: "destructive", title: "Image Error", description: "Could not process image." });
      } finally {
        setIsProcessingImage(false);
      }

    } else {
      clearImageSelection();
    }
  };
  
  const isCurrentlyProcessing = isProcessingImage || isSendingMessage;

  return (
    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-4 border-t bg-card/90 backdrop-blur-sm shadow-t-lg">
      {imageFileName && (
        <div className="mb-2 text-sm text-muted-foreground flex items-center justify-between">
          <span>Selected: {imageFileName}</span>
          <Button variant="link" size="sm" onClick={clearImageSelection} className="text-destructive p-0 h-auto" disabled={isCurrentlyProcessing}>Remove</Button>
        </div>
      )}
      {imageBase64 && !isProcessingImage && (
        <div className="mb-2 relative w-32 h-32 overflow-hidden rounded-md border">
          <img src={imageBase64} alt="Preview" className="object-cover w-full h-full" />
        </div>
      )}
       {isProcessingImage && <p className="text-xs text-primary mt-1 text-center">Processing image...</p>}


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
        <Button type="submit" size="icon" disabled={isCurrentlyProcessing || (text.trim() === "" && !imageBase64)} aria-label="Send message">
          {isSendingMessage ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      {isSendingMessage && !isProcessingImage && <p className="text-xs text-primary mt-1 text-center">Sending message...</p>}
    </form>
  );
}
