
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase/firebase";
import type { UserProfile } from "@/types";
import { addDoc, collection, serverTimestamp, type FieldValue } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, Mic, SendHorizonal } from "lucide-react";
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingFirestore, setIsSendingFirestore] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // UI state for voice recording
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const sendMessageToFirestore = async (messageText: string, imageUrl?: string | null) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      console.error("User not authenticated for sendMessageToFirestore");
      return false;
    }

    setIsSendingFirestore(true);
    console.log("Attempting to send message to Firestore:", { messageText, imageUrl });
    let success = false;
    try {
      const messageData: {
        text: string | null;
        imageUrl?: string;
        voiceUrl: string | null; // Placeholder
        senderId: string;
        senderName: string | null;
        timestamp: FieldValue;
      } = {
        text: messageText.trim() || null,
        voiceUrl: null, 
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
      };

      if (imageUrl) {
        messageData.imageUrl = imageUrl;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      console.log("Message successfully sent to Firestore.");
      toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
      success = true;
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ variant: "destructive", title: "Send Error", description: `Failed to send message: ${(error as Error).message}` });
      success = false;
    } finally {
      setIsSendingFirestore(false);
      if (success) {
        setText("");
        setImageFile(null);
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
    if (text.trim() === "" && !imageFile) {
        toast({ variant: "destructive", title: "Empty Message", description: "Cannot send an empty message." });
        return;
    }
    if (isUploadingImage || isSendingFirestore) return; // Prevent multiple submissions

    let uploadedImageUrl: string | null = null;

    if (imageFile) {
      setIsUploadingImage(true);
      console.log("Starting image upload for file:", imageFile.name);
      try {
        const storageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
        console.log("Image uploaded successfully. URL:", uploadedImageUrl);
        toast({ title: "Image Uploaded", description: "Image ready to be sent.", variant: "default" });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({ variant: "destructive", title: "Image Upload Error", description: `Failed to upload image: ${(error as Error).message}. Please try again.` });
        setIsUploadingImage(false); // Ensure state is reset
        return; // Stop if image upload fails
      } finally {
        setIsUploadingImage(false); // Ensure state is reset in all cases
      }
    }

    // Proceed to send message (with or without image URL)
    await sendMessageToFirestore(text, uploadedImageUrl);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: "Image size should not exceed 5MB." });
        if(imageInputRef.current) imageInputRef.current.value = "";
        setImageFile(null);
        return;
      }
      setImageFile(file);
      console.log("Image selected:", file.name);
    } else {
      setImageFile(null);
      console.log("Image selection cleared.");
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if(!isRecording) {
        toast({ title: "Voice Recording", description: "Voice recording started (UI only)." });
    } else {
        toast({ title: "Voice Recording", description: "Voice recording stopped (UI only). Message not sent." });
    }
  };

  const isProcessing = isUploadingImage || isSendingFirestore;

  return (
    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-4 border-t bg-card/90 backdrop-blur-sm shadow-t-lg">
      {imageFile && (
        <div className="mb-2 text-sm text-muted-foreground">
          Selected image: {imageFile.name} ({ (imageFile.size / 1024).toFixed(1) } KB)
          <Button variant="link" size="sm" onClick={() => { setImageFile(null); if(imageInputRef.current) imageInputRef.current.value = ""; }} className="ml-2 text-destructive" disabled={isProcessing}>Remove</Button>
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
            if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isProcessing}
        />
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" id="imageUpload" disabled={isProcessing} />
        <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isProcessing} aria-label="Attach image">
          <ImagePlus className="text-muted-foreground hover:text-primary" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={handleVoiceRecord} disabled={isProcessing} aria-label="Record voice message">
          <Mic className={cn("text-muted-foreground hover:text-primary", isRecording && "text-destructive animate-pulse")} />
        </Button>
        <Button type="submit" size="icon" disabled={isProcessing || (text.trim() === "" && !imageFile)} aria-label="Send message">
          {isUploadingImage || isSendingFirestore ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      {isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Uploading image...</p>}
      {isSendingFirestore && !isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Sending message...</p>}
    </form>
  );
}
