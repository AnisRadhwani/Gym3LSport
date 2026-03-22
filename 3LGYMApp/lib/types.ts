// Types for the application
import { Timestamp } from 'firebase/firestore';

// Coach type
export interface Coach {
  id: string;
  fullName: string;
  specialty: string;
  photoURL: string;
  description?: string;
  workingHours: {
    startTime: string;
    endTime: string;
  };
  daySpecificHours?: {
    monday?: { startTime: string; endTime: string; };
    tuesday?: { startTime: string; endTime: string; };
    wednesday?: { startTime: string; endTime: string; };
    thursday?: { startTime: string; endTime: string; };
    friday?: { startTime: string; endTime: string; };
    saturday?: { startTime: string; endTime: string; };
    sunday?: { startTime: string; endTime: string; };
  } | null;
  daysAvailable: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  isAvailableNow?: boolean;
}

// Event type
export interface Event {
  id: string;
  title: string;
  date: Timestamp | Date;
  startTime: string;
  endTime: string;
  coachId: string;
  coachName: string;
  coachPhoto?: string;
  location?: string;
  imageURL?: string;
  sendNotification: boolean;
  interestedUsers?: string[];
  isRecurring?: boolean; // Add this field to indicate if the event repeats weekly
  isRecurringProcessed?: boolean; // Flag to track if a recurring event has been processed
  interested?: boolean; // Client-side flag to track if current user is interested
}

// Category type (admin-defined, e.g. Karaté, Kickboxing)
export interface Category {
  id: string;
  name: string;
}

// User type
export interface User {
  id: string;
  displayName: string;
  fullName?: string;
  email: string;
  phoneNumber: string;
  photoURL?: string;
  membershipType: string;
  membershipDaysLeft: number;
  isAdmin: boolean;
  createdAt: Timestamp | Date;
  lastUpdated?: Timestamp | Date;
  pushToken?: string | null;
  /** IDs of categories the user belongs to (0, 1, or more). Admin-assigned only. */
  categoryIds?: string[];
  /** Admin-only notes about this user. Visible to the user on their profile. */
  notes?: string;
}

// Notification type
export interface Notification {
  id: string;
  title: string;
  message: string;
  sentAt: Timestamp | Date;
  sentBy: string;
  recipients: string[] | 'all';
}