
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface Message {
  id: string;
  chatId?: string; // Added to help with Firestore path for deletion
  text?: string;
  imageDataUri?: string; 
  senderId: string;
  senderName: string | null;
  timestamp: Timestamp | Date;
  reactions?: { [emoji: string]: string[] };
}

