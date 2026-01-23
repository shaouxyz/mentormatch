// Type Definitions
// Centralized type definitions for the application

export interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  email: string;
  passwordHash: string;
  id: string;
  createdAt: string;
  isTestAccount?: boolean;
}

export interface CurrentUser {
  email: string;
  id: string;
  isTestAccount?: boolean;
}

export interface MentorshipRequest {
  id: string;
  requesterEmail: string;
  requesterName: string;
  mentorEmail: string;
  mentorName: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  responseNote?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface MentorshipConnection {
  name: string;
  email: string;
  expertise?: string;
  interest?: string;
  note?: string;
  responseNote?: string;
  connectedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  receiverName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of email addresses
  participantNames: { [email: string]: string };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: { [email: string]: number };
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  organizerEmail: string;
  organizerName: string;
  participantEmail: string;
  participantName: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  time: string; // ISO time string
  duration: number; // Duration in minutes
  location: string;
  locationType: 'in-person' | 'virtual' | 'phone';
  meetingLink?: string; // For virtual meetings
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  responseNote?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}
