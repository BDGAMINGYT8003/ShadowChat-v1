
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface Message {
  id: string;
  text?: string;
  imageDataUri?: string; // Changed from imageUrl to store Base64 Data URI
  voiceUrl?: string; // Placeholder for voice message URL
  senderId: string;
  senderName: string | null;
  timestamp: Timestamp | Date; // Firestore serverTimestamp or client Date before sync
  reactions?: { [emoji: string]: string[] }; // User UIDs who reacted
}
