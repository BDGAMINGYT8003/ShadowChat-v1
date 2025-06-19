
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase/firebase";
import type { UserProfile } from "@/types";
import { addDoc, collection, serverTimestamp, type FieldValue } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadString } from "firebase/storage";
import { ImagePlus, Loader2, SendHorizonal } from "lucide-react";
import type { ChangeEvent} from 'react';
import React, { useState, useRef } from "react";

interface MessageInputProps {
  currentUser: UserProfile | null;
  chatId?: string;
}

export function MessageInput({ currentUser, chatId = "global_chat" }: MessageInputProps) {
  const [text, setText] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageBase64Preview, setImageBase64Preview] = useState<string | null>(null); // For preview only
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingFirestore, setIsSendingFirestore] = useState(false);
  
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
    setSelectedImageFile(null);
    setImageBase64Preview(null);
    setImageFileName(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Auth Error", description: "User not authenticated for image upload." });
      return null;
    }
    setIsUploadingImage(true);
    console.log("Starting image upload to Firebase Storage...");
    try {
      const uniqueFileName = `${currentUser.uid}_${Date.now()}_${file.name}`;
      const imageRef = storageRef(storage, `chat_images/${chatId}/${uniqueFileName}`);
      
      // Convert file to base64 data URL for uploadString
      const base64DataUrl = await convertFileToBase64(file);
      
      const snapshot = await uploadString(imageRef, base64DataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Image uploaded successfully. Download URL:", downloadURL);
      toast({ title: "Image Uploaded", description: "Image ready to be sent.", variant: "default" });
      return downloadURL;
    } catch (error: any) {
      console.error("Firebase Storage Upload Error:", error);
      let description = "Failed to upload image.";
      if (error.code) {
        description = `Image upload failed: ${error.code} - ${error.message}`;
      } else if (error.message) {
        description = `Image upload failed: ${error.message}`;
      }
      toast({ variant: "destructive", title: "Upload Error", description });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const sendMessageToFirestore = async (messageText: string, imageUrl?: string | null) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Auth Error", description: "User not authenticated to send message." });
      return false;
    }
    setIsSendingFirestore(true);
    console.log("Sending message to Firestore...");
    let success = false;
    try {
      const messageData: {
        text: string | null;
        imageDataUri?: string; // Changed from imageUrl to imageDataUri to match Firestore storage
        senderId: string;
        senderName: string | null;
        timestamp: FieldValue;
      } = {
        text: messageText.trim() || null,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
      };

      if (imageUrl) { // If an image was uploaded to storage, this will be its download URL
        messageData.imageDataUri = imageUrl; // Store the download URL
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      toast({ title: "Sent!", description: "Your message has been sent.", variant: "default" });
      success = true;
    } catch (error: any)
     {
      console.error("Firestore Send Error:", error);
      let description = "Failed to send message.";
      if (error.code === 'resource-exhausted' || (error.message && error.message.includes("document is too large"))) {
        description = "Message (possibly image) is too large for Firestore. Please use a smaller image or shorter text.";
      } else if (error.code) {
        description = `Failed to send message: ${error.code} - ${error.message}`;
      } else if (error.message) {
        description = `Failed to send message: ${error.message}`;
      }
      toast({ variant: "destructive", title: "Send Error", description });
      success = false;
    } finally {
      setIsSendingFirestore(false);
    }
    return success;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Auth Error", description: "You must be logged in to send messages." });
      return;
    }
    if (text.trim() === "" && !selectedImageFile) {
        toast({ variant: "destructive", title: "Empty Message", description: "Cannot send an empty message." });
        return;
    }
    if (isUploadingImage || isSendingFirestore) return;

    let finalImageUrl: string | null = null;

    if (selectedImageFile) {
      finalImageUrl = await uploadImageToStorage(selectedImageFile);
      if (!finalImageUrl) { // Image upload failed
        return; // Error toast would have been shown by uploadImageToStorage
      }
    }
    
    // Proceed to send message to Firestore (with or without image URL)
    const firestoreSuccess = await sendMessageToFirestore(text, finalImageUrl);

    if (firestoreSuccess) {
      setText("");
      clearImageSelection();
    }
    // If image uploaded but Firestore failed, image selection and text remain for retry.
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Firestore document limit is 1MiB. Base64 encoding adds ~33%.
      // Let's warn for original files over 700KB as they might exceed this after encoding.
      // This warning is for Base64 storage. For Firebase Storage, limits are much higher.
      // Since we switched to Firebase Storage, this specific size check is less critical here,
      // but good to keep in mind for general file handling. Let's keep a generic one for preview.
      if (file.size > 5 * 1024 * 1024) { // Warn for files > 5MB for preview generation
        toast({ variant: "destructive", title: "File too large for preview", description: "Selected image is very large, preview might be slow or fail. Upload will proceed." });
      }
      
      setSelectedImageFile(file);
      setImageFileName(file.name);

      // Generate Base64 preview (optional, can be slow for large images)
      try {
        const base64PreviewString = await convertFileToBase64(file);
        setImageBase64Preview(base64PreviewString); // For local preview before upload
      } catch (error) {
        console.error("Error generating image preview:", error);
        setImageBase64Preview(null); // Clear preview on error
        toast({ variant: "destructive", title: "Preview Error", description: "Could not generate image preview." });
      }

    } else {
      clearImageSelection();
    }
  };
  
  const isCurrentlyProcessing = isUploadingImage || isSendingFirestore;

  return (
    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-4 border-t bg-card/90 backdrop-blur-sm shadow-t-lg">
      {imageFileName && (
        <div className="mb-2 text-sm text-muted-foreground flex items-center justify-between">
          <span>Selected: {imageFileName}</span>
          <Button variant="link" size="sm" onClick={clearImageSelection} className="text-destructive p-0 h-auto" disabled={isCurrentlyProcessing}>Remove</Button>
        </div>
      )}
      {imageBase64Preview && !isUploadingImage && ( // Show preview if available and not currently uploading
        <div className="mb-2 relative w-32 h-32 overflow-hidden rounded-md border">
          <img src={imageBase64Preview} alt="Preview" className="object-cover w-full h-full" />
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
        <Button type="submit" size="icon" disabled={isCurrentlyProcessing || (text.trim() === "" && !selectedImageFile)} aria-label="Send message">
          {isUploadingImage || isSendingFirestore ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      {isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Uploading image...</p>}
      {isSendingFirestore && !isUploadingImage && <p className="text-xs text-primary mt-1 text-center">Sending message...</p>}
    </form>
  );
}
