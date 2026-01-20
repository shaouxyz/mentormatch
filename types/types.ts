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
