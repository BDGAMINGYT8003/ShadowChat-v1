
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
  chatId?: string;
}

export function MessageInput({ currentUser, chatId = "global_chat" }: MessageInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingFirestore, setIsSendingFirestore] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const sendMessageToFirestore = async (messageText: string, imageUrl?: string | null) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      console.error("User not authenticated for sendMessageToFirestore");
      return false;
    }

    setIsSendingFirestore(true);
    console.log("Attempting to send message to Firestore:", { messageText, imageUrl: imageUrl || "No image" });
    let success = false;
    try {
      const messageData: {
        text: string | null;
        imageUrl?: string;
        voiceUrl: string | null;
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
      } else {
        // Ensure imageUrl is not undefined if no image is provided
        // Firestore does not support undefined values.
        // We can either omit the field or set it to null.
        // Omitting is cleaner if the field is truly optional.
        // delete messageData.imageUrl; // Or set to null if schema expects it
      }


      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      console.log("Message successfully sent to Firestore.");
      // Only toast success if it's not just an image upload confirmation
      if (messageText.trim() || !imageUrl) { // Avoid double toast if only image was "sent"
        toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
      }
      success = true;
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ variant: "destructive", title: "Send Error", description: `Failed to send message: ${(error as Error).message}` });
      success = false;
    } finally {
      setIsSendingFirestore(false);
      if (success) {
        setText("");
        setImageFile(null); // Clear image file only on full success
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
    if (isUploadingImage || isSendingFirestore) return;

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
      } catch (error: any) {
        console.error("Error uploading image:", error);
        console.error("Firebase Storage Error Code:", error.code); // Log specific Firebase error code
        console.error("Firebase Storage Error Message:", error.message);
        toast({ variant: "destructive", title: "Image Upload Error", description: `Failed to upload image: ${error.message}. Check console for details.` });
        setIsUploadingImage(false);
        return; 
      } finally {
        // This will be set to false IF an error occurred above and we returned.
        // If successful, it will be set false after attempting to send to Firestore.
        // Let's ensure it's reset here too for the case of upload success but user cancels before Firestore send (not current logic, but robust)
        // Actually, the current logic means setIsUploadingImage will be set to false here only if the upload failed.
        // If it succeeded, it remains true until after Firestore send.
        // Corrected logic: reset isUploadingImage here if an error occurred.
        // If successful, setIsUploadingImage should transition to false after this block.
      }
      setIsUploadingImage(false); // Reset regardless of success/failure of upload, before proceeding to Firestore
    }

    // Proceed to send message (with or without image URL)
    // Note: If image upload succeeded, uploadedImageUrl will have a value.
    // If no image was selected, or upload failed (and returned), this proceeds.
    const firestoreSuccess = await sendMessageToFirestore(text, uploadedImageUrl);
    
    // If Firestore send was successful, states (text, imageFile) were already reset within sendMessageToFirestore.
    // If it failed, they were not, allowing user to retry.
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
          {isUploadingImage ? <Loader2 className="animate-spin" /> : isSendingFirestore ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      {isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Uploading image...</p>}
      {isSendingFirestore && !isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Sending message...</p>}
    </form>
  );
}
