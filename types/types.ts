// Type Definitions
// Centralized type definitions for the application

export interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber?: string;
  location?: string;
  /** CASPA role: BOA, BOD, BOV, VP, President, LTM, Former BOA/BOD/BOV/VP/President, None of Above */
  caspaRole?: string;
  /** LTM number */
  ltmNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  /** If true, user has suspended their account and cannot use the app until restored */
  suspended?: boolean;
  suspendedAt?: string;
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
  lastMessageSenderEmail?: string;
  unreadCount: { [email: string]: number };
  // Last time each participant read the conversation (ISO timestamp).
  lastReadAt?: { [email: string]: string };
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
  /** Email of the user who requested to cancel this accepted meeting. When set, the other party can agree or decline. */
  cancelRequestedBy?: string | null;
  /** Emails of users who agreed to the cancel request. When the other party agrees, status is set to cancelled. */
  cancelApprovedBy?: string[] | null;
  /** Email of the user who requested to reschedule this accepted meeting. When set, the other party can agree or decline. */
  rescheduleRequestedBy?: string | null;
  /** Proposed new date (ISO string) for the reschedule request. */
  rescheduleProposedDate?: string | null;
  /** Proposed new time (ISO string) for the reschedule request. */
  rescheduleProposedTime?: string | null;
  /** Proposed new duration in minutes. If not set, current meeting duration is kept. */
  rescheduleProposedDuration?: number | null;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export interface InvitationCode {
  id: string;
  code: string; // Unique invitation code
  createdBy: string; // Email of user who created/received it
  usedBy?: string; // Email of user who used it (if used)
  usedAt?: string; // ISO timestamp when used
  isUsed: boolean;
  createdAt: string; // ISO timestamp
}

export interface InboxItem {
  id: string;
  recipientEmail: string;
  type: 'invitation_code' | 'mentorship_accepted' | 'meeting_request';
  title: string;
  message: string;
  invitationCode?: string; // For invitation_code type
  read: boolean;
  createdAt: string; // ISO timestamp
}
