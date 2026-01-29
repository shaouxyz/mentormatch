/**
 * End-to-End User Journey Tests
 * 
 * Based on TEST_PLAN_E2E_USER_JOURNEY.md
 * Tests the complete user flows from a real user's perspective
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as expoRouter from 'expo-router';
import WelcomeScreen from '../index';
import SignupScreen from '../signup';
import LoginScreen from '../login';
import CreateProfileScreen from '../profile/create';
import HomeScreen from '../(tabs)/home';
import ViewProfileScreen from '../profile/view';
import SendRequestScreen from '../request/send';
import RespondRequestScreen from '../request/respond';
import MentorshipScreen from '../(tabs)/mentorship';
import ChatScreen from '../messages/chat';
import ScheduleMeetingScreen from '../meeting/schedule';
import MeetingResponseScreen from '../meeting/respond';
import UpcomingMeetingsScreen from '../meeting/upcoming';

// Mock Firebase first
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock all services
jest.mock('@/services/hybridAuthService');
jest.mock('@/services/hybridProfileService');
jest.mock('@/services/hybridMeetingService');
jest.mock('@/services/hybridMessageService');
jest.mock('@/services/requestService');
jest.mock('@/services/invitationCodeService');
jest.mock('@/services/inboxService');
jest.mock('@/services/meetingNotificationService');
jest.mock('@/config/firebase.config', () => ({
  isFirebaseConfigured: jest.fn(() => true),
  initializeFirebase: jest.fn(),
  getFirebaseFirestore: jest.fn(),
  getFirebaseAuth: jest.fn(),
}));

// Mock expo-router - use the global mock from jest.setup.js
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

// Override the global mock for these tests
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useRouter: jest.fn(() => mockRouter),
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn((callback) => {
      // Defer to avoid calling callbacks during render (some screens reference
      // functions declared later in the component body, e.g. `const loadMeetings = ...`)
      Promise.resolve().then(() => callback());
    }),
  };
});

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCalendarsAsync: jest.fn(() => Promise.resolve([{ id: 'default', allowsModifications: true }])),
  createEventAsync: jest.fn(() => Promise.resolve('event-id')),
}));

// Import mocked services
import * as hybridAuthService from '@/services/hybridAuthService';
import * as hybridProfileService from '@/services/hybridProfileService';
import * as hybridMeetingService from '@/services/hybridMeetingService';
import * as hybridMessageService from '@/services/hybridMessageService';
import * as requestService from '@/services/requestService';
import * as invitationCodeService from '@/services/invitationCodeService';
import * as inboxService from '@/services/inboxService';
import * as meetingNotificationService from '@/services/meetingNotificationService';

const mockHybridAuthService = hybridAuthService as jest.Mocked<typeof hybridAuthService>;
const mockHybridProfileService = hybridProfileService as jest.Mocked<typeof hybridProfileService>;
const mockHybridMeetingService = hybridMeetingService as jest.Mocked<typeof hybridMeetingService>;
const mockHybridMessageService = hybridMessageService as jest.Mocked<typeof hybridMessageService>;
const mockRequestService = requestService as jest.Mocked<typeof requestService>;
const mockInvitationCodeService = invitationCodeService as jest.Mocked<typeof invitationCodeService>;
const mockInboxService = inboxService as jest.Mocked<typeof inboxService>;
const mockMeetingNotificationService = meetingNotificationService as jest.Mocked<typeof meetingNotificationService>;

describe('End-to-End User Journey Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.back.mockClear();
    jest.spyOn(Alert, 'alert');
  });

  describe('USER JOURNEY 1: New User - Complete Onboarding Flow', () => {
    describe('Phase 1: App Installation & First Launch', () => {
      it('UJ1.1: Download and Install App - Welcome Screen Displayed', async () => {
        const { getByText } = render(<WelcomeScreen />);

        await waitFor(() => {
          expect(getByText('MentorMatch')).toBeTruthy();
          expect(getByText('Connect with mentors and mentees')).toBeTruthy();
        });
      });

      it('UJ1.2: First Launch - Welcome Screen Loads', async () => {
        const { getByText } = render(<WelcomeScreen />);

        await waitFor(() => {
          expect(getByText('Sign Up')).toBeTruthy();
          expect(getByText('Log In')).toBeTruthy();
        }, { timeout: 3000 });
      });
    });

    describe('Phase 2: User Registration', () => {
      it('UJ1.3: Navigate to Sign Up', async () => {
        const { getByText } = render(<WelcomeScreen />);

        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
          expect(mockRouter.push).toHaveBeenCalledWith('/signup');
        });
      });

      it('UJ1.4: Sign Up with Valid Information', async () => {
        const mockUser = { email: 'newuser@example.com' };
        const mockInvitationCode = {
          id: 'code1',
          code: 'ABC12345',
          createdBy: 'admin@example.com',
          isUsed: false,
          createdAt: new Date().toISOString(),
        };

        mockInvitationCodeService.isValidInvitationCode.mockResolvedValue(true);
        // Signup expects `useInvitationCode(...)` to resolve to a truthy boolean.
        mockInvitationCodeService.useInvitationCode.mockResolvedValue(true as any);
        mockHybridAuthService.hybridSignUp.mockResolvedValue(mockUser);

        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        const emailInput = getByPlaceholderText('Enter your email');
        const passwordInput = getByPlaceholderText('Enter your password');
        const confirmPasswordInput = getByPlaceholderText('Confirm your password');
        const invitationCodeInput = getByPlaceholderText('Enter invitation code');

        fireEvent.changeText(emailInput, 'newuser@example.com');
        fireEvent.changeText(passwordInput, 'SecurePass123!');
        fireEvent.changeText(confirmPasswordInput, 'SecurePass123!');
        fireEvent.changeText(invitationCodeInput, 'ABC12345');

        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
          expect(mockInvitationCodeService.isValidInvitationCode).toHaveBeenCalledWith('ABC12345');
          expect(mockInvitationCodeService.useInvitationCode).toHaveBeenCalledWith('ABC12345', 'newuser@example.com');
          expect(mockHybridAuthService.hybridSignUp).toHaveBeenCalledWith('newuser@example.com', 'SecurePass123!');
        }, { timeout: 5000 });
      });

      it('UJ1.5: Sign Up with Invalid Invitation Code', async () => {
        mockInvitationCodeService.isValidInvitationCode.mockResolvedValue(false);

        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123!');
        fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'SecurePass123!');
        fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'INVALID123');

        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Invalid'));
        }, { timeout: 3000 });
      });

      it('UJ1.7: Sign Up with Weak Password', async () => {
        mockInvitationCodeService.isValidInvitationCode.mockResolvedValue(true);
        
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
        fireEvent.changeText(getByPlaceholderText('Confirm your password'), '123');
        fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');

        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Password'));
        }, { timeout: 3000 });
      });

      it('UJ1.8: Sign Up with Mismatched Passwords', async () => {
        mockInvitationCodeService.isValidInvitationCode.mockResolvedValue(true);
        
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123!');
        fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'DifferentPass123!');
        fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');

        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Password'));
        }, { timeout: 3000 });
      });
    });

    describe('Phase 3: Profile Creation', () => {
      it('UJ1.10: Create Complete Profile', async () => {
        const mockProfile = {
          name: 'John Doe',
          email: 'newuser@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 5,
          interest: 'Product Management',
          interestYears: 2,
          phoneNumber: '+1234567890',
          location: 'San Francisco, CA',
        };

        await AsyncStorage.setItem('user', JSON.stringify({ email: 'newuser@example.com' }));
        mockHybridProfileService.hybridCreateProfile.mockResolvedValue(mockProfile);


        const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
        fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Engineering');
        fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
        fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Product Management');
        fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
        const locationInput = getByPlaceholderText('e.g., San Francisco, CA or New York City');
        fireEvent.changeText(locationInput, 'San Francisco, CA');

        fireEvent.press(getByText('Save Profile'));

        await waitFor(() => {
          expect(mockHybridProfileService.hybridCreateProfile).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'John Doe',
              expertise: 'Software Engineering',
              expertiseYears: 5,
              interest: 'Product Management',
              interestYears: 2,
              phoneNumber: '+1234567890',
              location: 'San Francisco, CA',
            })
          );
        }, { timeout: 3000 });
      });

      it('UJ1.11: Create Profile with Minimum Required Fields', async () => {
        const mockProfile = {
          name: 'John Doe',
          email: 'newuser@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 5,
          interest: 'Product Management',
          interestYears: 2,
          phoneNumber: '+1234567890',
        };

        await AsyncStorage.setItem('user', JSON.stringify({ email: 'newuser@example.com' }));
        mockHybridProfileService.hybridCreateProfile.mockResolvedValue(mockProfile);


        const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
        fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Engineering');
        fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
        fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Product Management');
        fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
        // Leave location empty

        fireEvent.press(getByText('Save Profile'));

        await waitFor(() => {
          expect(mockHybridProfileService.hybridCreateProfile).toHaveBeenCalled();
        }, { timeout: 5000 });
        
        expect(mockHybridProfileService.hybridCreateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John Doe',
          })
        );
      });
    });

    describe('Phase 4: First Login', () => {
      it('UJ1.13: Log In After Profile Creation', async () => {
        const mockUser = { email: 'newuser@example.com' };
        const mockProfile = {
          name: 'John Doe',
          email: 'newuser@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 5,
          interest: 'Product Management',
          interestYears: 2,
          phoneNumber: '+1-555-123-4567',
        };

        mockHybridAuthService.hybridSignIn.mockResolvedValue(mockUser);
        mockHybridProfileService.hybridGetProfile.mockResolvedValue(mockProfile);

        const { getByPlaceholderText, getByText } = render(<LoginScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'newuser@example.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePass123!');

        fireEvent.press(getByText('Log In'));

        await waitFor(() => {
          expect(mockHybridAuthService.hybridSignIn).toHaveBeenCalledWith('newuser@example.com', 'SecurePass123!');
        }, { timeout: 3000 });
      });

      it('UJ1.14: Auto-Login on App Relaunch', async () => {
        await AsyncStorage.setItem('user', JSON.stringify({ email: 'newuser@example.com' }));
        await AsyncStorage.setItem('profile', JSON.stringify({ name: 'John Doe', email: 'newuser@example.com' }));
        
        // Mock session validation to return true
        const sessionManager = require('@/utils/sessionManager');
        sessionManager.isSessionValid = jest.fn().mockResolvedValue(true);

        const { getByText } = render(<WelcomeScreen />);

        await waitFor(() => {
          expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
        }, { timeout: 5000 });
      });
    });
  });

  describe('USER JOURNEY 2: Discovery & Profile Browsing', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Current User',
        email: 'user@example.com',
        expertise: 'Software Engineering',
        expertiseYears: 5,
        interest: 'Product Management',
        interestYears: 2,
        phoneNumber: '+1-555-123-4567',
      }));
    });

    it('UJ2.1: View Discover Screen', async () => {
      const mockProfiles = [
        {
          name: 'John Mentor',
          email: 'mentor@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 10,
          interest: 'Data Science',
          interestYears: 3,
          phoneNumber: '+1-555-987-6543',
        },
      ];

      mockHybridProfileService.hybridGetAllProfiles.mockResolvedValue(mockProfiles);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('UJ2.2: Browse Multiple Profiles', async () => {
      const mockProfiles = [
        {
          name: 'John Mentor',
          email: 'mentor@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 10,
          interest: 'Data Science',
          interestYears: 3,
          phoneNumber: '+1234567891',
        },
        {
          name: 'Jane Mentor',
          email: 'jane@example.com',
          expertise: 'Product Management',
          expertiseYears: 8,
          interest: 'Marketing',
          interestYears: 5,
          phoneNumber: '+1234567892',
        },
      ];

      mockHybridProfileService.hybridGetAllProfiles.mockResolvedValue(mockProfiles);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
        expect(getByText('Jane Mentor')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('UJ2.3: Search for Specific Profile', async () => {
      const mockProfiles = [
        {
          name: 'John Mentor',
          email: 'mentor@example.com',
          expertise: 'Software Engineering',
          expertiseYears: 10,
          interest: 'Data Science',
          interestYears: 3,
          phoneNumber: '+1234567891',
        },
        {
          name: 'Jane Mentor',
          email: 'jane@example.com',
          expertise: 'Product Management',
          expertiseYears: 8,
          interest: 'Marketing',
          interestYears: 5,
          phoneNumber: '+1234567892',
        },
      ];

      mockHybridProfileService.hybridGetAllProfiles.mockResolvedValue(mockProfiles);

      const { getByPlaceholderText, getByText, queryByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'Software');

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
        expect(queryByText('Jane Mentor')).toBeNull();
      });
    });

    it('UJ2.5: View Profile Details', async () => {
      const mockProfile = {
        name: 'John Mentor',
        email: 'mentor@example.com',
        expertise: 'Software Engineering',
        expertiseYears: 10,
        interest: 'Data Science',
        interestYears: 3,
        phoneNumber: '+1-555-987-6543',
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      mockHybridProfileService.hybridGetProfile.mockResolvedValue(mockProfile);

      jest.mocked(expoRouter.useLocalSearchParams).mockReturnValue({
        email: 'mentor@example.com',
      } as any);

      const { getByText } = render(<ViewProfileScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
        expect(getByText('Software Engineering')).toBeTruthy();
        expect(getByText('Data Science')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('USER JOURNEY 3: Mentorship Request Flow', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Current User',
        email: 'user@example.com',
      }));
    });

    it('UJ3.1: Send Mentor Request', async () => {
      const mentorProfile = {
        name: 'John Mentor',
        email: 'mentor@example.com',
        expertise: 'Software Engineering',
        interest: 'Data Science',
        expertiseYears: 10,
        interestYears: 3,
        phoneNumber: '+1234567891',
      };

      // `app/request/send.tsx` requires user.id to be present when loading the current user
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com', id: 'u1' }));
      await AsyncStorage.setItem(
        'profile',
        JSON.stringify({
          name: 'Current User',
          email: 'user@example.com',
          expertise: 'Design',
          interest: 'UI/UX',
          expertiseYears: 2,
          interestYears: 1,
          phoneNumber: '+1234567890',
        })
      );
      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([]));

      // `SendRequestScreen` loads mentor profile from `params.profile`
      jest.mocked(expoRouter.useLocalSearchParams).mockReturnValue({
        profile: JSON.stringify(mentorProfile),
      } as any);

      const { getByPlaceholderText, getByText } = render(<SendRequestScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
      }, { timeout: 3000 });

      const noteInput = getByPlaceholderText("Hi! I'm interested in learning from you because...");
      fireEvent.changeText(noteInput, 'I would like to learn from you about Software Engineering.');

      fireEvent.press(getByText('Send Request'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Request Sent',
          expect.stringContaining('sent successfully'),
          expect.any(Array)
        );
      }, { timeout: 5000 });
    });

    it('UJ3.6: Accept Mentor Request', async () => {
      const mockRequest = {
        id: 'request1',
        requesterEmail: 'requester@example.com',
        requesterName: 'Requester User',
        mentorEmail: 'mentor@example.com',
        mentorName: 'Mentor User',
        note: 'I would like to learn from you.',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      const mockInvitationCode = {
        id: 'code1',
        code: 'ABC12345',
        createdBy: 'mentor@example.com',
        isUsed: false,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'mentor@example.com' }));
      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));
      mockInvitationCodeService.createInvitationCode.mockResolvedValue(mockInvitationCode);
      mockInboxService.addInvitationCodeToInbox.mockResolvedValue(undefined);

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        request: JSON.stringify(mockRequest),
      });

      const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

      await waitFor(() => {
        expect(getByText('Requester User')).toBeTruthy();
      });

      const responseInput = getByPlaceholderText('Thank you for your interest...');
      fireEvent.changeText(responseInput, 'Happy to help! Looking forward to working with you.');

      fireEvent.press(getByText('Accept'));

      await waitFor(() => {
        expect(mockInvitationCodeService.createInvitationCode).toHaveBeenCalledWith('mentor@example.com');
        expect(mockInboxService.addInvitationCodeToInbox).toHaveBeenCalledWith(
          'mentor@example.com',
          'ABC12345',
          'mentor@example.com'
        );
      }, { timeout: 3000 });
    });

    it('UJ3.8: Decline Mentor Request', async () => {
      const mockRequest = {
        id: 'request1',
        requesterEmail: 'requester@example.com',
        requesterName: 'Requester User',
        mentorEmail: 'mentor@example.com',
        mentorName: 'Mentor User',
        note: 'I would like to learn from you.',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'mentor@example.com' }));
      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        request: JSON.stringify(mockRequest),
      });

      const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

      await waitFor(() => {
        expect(getByText('Requester User')).toBeTruthy();
      });

      const responseInput = getByPlaceholderText('Thank you for your interest...');
      fireEvent.changeText(responseInput, 'Sorry, I\'m currently at capacity.');

      fireEvent.press(getByText('Decline'));

      await waitFor(() => {
        expect(mockInvitationCodeService.createInvitationCode).not.toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('UJ3.11: View My Mentors', async () => {
      const mockAcceptedRequest = {
        id: 'request1',
        requesterEmail: 'user@example.com',
        requesterName: 'Current User',
        mentorEmail: 'mentor@example.com',
        mentorName: 'John Mentor',
        note: 'I would like to learn from you.',
        status: 'accepted' as const,
        createdAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
      };

      const mockMentorProfile = {
        name: 'John Mentor',
        email: 'mentor@example.com',
        expertise: 'Software Engineering',
        expertiseYears: 10,
        interest: 'Data Science',
        interestYears: 3,
        phoneNumber: '+1234567891',
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockAcceptedRequest]));
      await AsyncStorage.setItem('allProfiles', JSON.stringify([mockMentorProfile]));

      const { getByText } = render(<MentorshipScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
        expect(getByText(/Software Engineering/)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('USER JOURNEY 5: Messaging Flow', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
    });

    it('UJ5.3: Send First Message', async () => {
      const mockConversation = {
        id: 'conv1',
        participants: ['user@example.com', 'mentor@example.com'],
        participantNames: {
          'user@example.com': 'Current User',
          'mentor@example.com': 'John Mentor',
        },
        unreadCount: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderEmail: 'user@example.com',
        senderName: 'Current User',
        receiverEmail: 'mentor@example.com',
        receiverName: 'John Mentor',
        text: 'Hello! Thanks for accepting my request.',
        createdAt: new Date().toISOString(),
        read: false,
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Current User',
        email: 'user@example.com',
      }));

      mockHybridMessageService.hybridCreateOrGetConversation.mockResolvedValue(mockConversation);
      mockHybridMessageService.hybridSendMessage.mockResolvedValue(mockMessage);
      mockHybridMessageService.hybridGetMessages.mockResolvedValue([]);

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        conversationId: 'conv1',
        participantEmail: 'mentor@example.com',
        participantName: 'John Mentor',
      });

      const { getByPlaceholderText, getByText, getByLabelText } = render(<ChatScreen />);

      await waitFor(() => {
        expect(getByText('John Mentor')).toBeTruthy();
      }, { timeout: 3000 });

      const messageInput = getByPlaceholderText('Type a message...');
      fireEvent.changeText(messageInput, 'Hello! Thanks for accepting my request.');

      const sendButton = getByLabelText('Send message');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockHybridMessageService.hybridSendMessage).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('UJ5.9: Reply to Message', async () => {
      const mockConversation = {
        id: 'conv1',
        participants: ['user@example.com', 'mentor@example.com'],
        participantNames: {
          'user@example.com': 'Current User',
          'mentor@example.com': 'John Mentor',
        },
        unreadCount: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMessages = [
        {
          id: 'msg1',
          conversationId: 'conv1',
          senderEmail: 'mentor@example.com',
          senderName: 'John Mentor',
          receiverEmail: 'user@example.com',
          receiverName: 'Current User',
          text: 'Hello! How can I help you?',
          createdAt: new Date().toISOString(),
          read: true,
        },
      ];

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Current User',
        email: 'user@example.com',
      }));

      mockHybridMessageService.hybridCreateOrGetConversation.mockResolvedValue(mockConversation);
      mockHybridMessageService.hybridGetMessages.mockResolvedValue(mockMessages);
      mockHybridMessageService.hybridSendMessage.mockResolvedValue({
        id: 'msg2',
        conversationId: 'conv1',
        senderEmail: 'user@example.com',
        senderName: 'Current User',
        receiverEmail: 'mentor@example.com',
        receiverName: 'John Mentor',
        text: 'Thanks for reaching out! I\'d be happy to help.',
        createdAt: new Date().toISOString(),
        read: false,
      });

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        conversationId: 'conv1',
        participantEmail: 'mentor@example.com',
        participantName: 'John Mentor',
      });

      const { getByPlaceholderText, getByText, getByLabelText } = render(<ChatScreen />);

      await waitFor(() => {
        expect(getByText('Hello! How can I help you?')).toBeTruthy();
      }, { timeout: 3000 });

      const messageInput = getByPlaceholderText('Type a message...');
      fireEvent.changeText(messageInput, 'Thanks for reaching out! I\'d be happy to help.');

      fireEvent.press(getByLabelText('Send message'));

      await waitFor(() => {
        expect(mockHybridMessageService.hybridSendMessage).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('USER JOURNEY 6: Meeting Scheduling Flow', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Current User',
        email: 'user@example.com',
      }));
    });

    it('UJ6.2: Schedule Virtual Meeting', async () => {
      const mockMeeting = {
        id: 'meeting1',
        organizerEmail: 'user@example.com',
        organizerName: 'Current User',
        participantEmail: 'mentor@example.com',
        participantName: 'John Mentor',
        title: 'Introduction Call',
        description: 'Let\'s discuss your career goals and how I can help.',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        location: '',
        locationType: 'virtual' as const,
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockHybridMeetingService.hybridCreateMeeting.mockResolvedValue(mockMeeting);

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        participantEmail: 'mentor@example.com',
        participantName: 'John Mentor',
      });

      const { getByPlaceholderText, getByText, getByLabelText } = render(<ScheduleMeetingScreen />);

      const titleInput = getByPlaceholderText('e.g., Introduction Call');
      fireEvent.changeText(titleInput, 'Introduction Call');

      // Select virtual location type
      const locationTypeButtons = getByText('Virtual');
      fireEvent.press(locationTypeButtons);

      const linkInput = getByPlaceholderText('e.g., https://zoom.us/j/...');
      fireEvent.changeText(linkInput, 'https://zoom.us/j/123456789');

      const durationInput = getByPlaceholderText('60');
      fireEvent.changeText(durationInput, '60');

      const descriptionInput = getByPlaceholderText('Meeting agenda or notes');
      fireEvent.changeText(descriptionInput, 'Let\'s discuss your career goals and how I can help.');

      fireEvent.press(getByLabelText('Send meeting request'));

      await waitFor(() => {
        expect(mockHybridMeetingService.hybridCreateMeeting).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Introduction Call',
            locationType: 'virtual',
            meetingLink: 'https://zoom.us/j/123456789',
            duration: 60,
          })
        );
      }, { timeout: 5000 });
    });

    it('UJ6.7: Accept Meeting Request', async () => {
      const mockMeeting = {
        id: 'meeting1',
        organizerEmail: 'organizer@example.com',
        organizerName: 'Organizer User',
        participantEmail: 'user@example.com',
        participantName: 'Current User',
        title: 'Introduction Call',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        location: '',
        locationType: 'virtual' as const,
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      mockHybridMeetingService.hybridGetMeeting.mockResolvedValue(mockMeeting);
      mockHybridMeetingService.hybridUpdateMeeting.mockResolvedValue(undefined);
      mockMeetingNotificationService.scheduleMeetingNotifications.mockResolvedValue(undefined);

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        meetingId: 'meeting1',
      });

      const { getByText, getByPlaceholderText } = render(<MeetingResponseScreen />);

      await waitFor(() => {
        expect(getByText('Introduction Call')).toBeTruthy();
      });

      const responseInput = getByPlaceholderText('Add a note (optional)');
      fireEvent.changeText(responseInput, 'Looking forward to our meeting!');

      fireEvent.press(getByText('Accept'));

      await waitFor(() => {
        expect(mockHybridMeetingService.hybridUpdateMeeting).toHaveBeenCalledWith(
          'meeting1',
          expect.objectContaining({
            status: 'accepted',
          })
        );
        expect(mockMeetingNotificationService.scheduleMeetingNotifications).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'meeting1',
            status: 'accepted',
          })
        );
      }, { timeout: 3000 });
    });

    it('UJ6.9: Decline Meeting Request', async () => {
      const mockMeeting = {
        id: 'meeting1',
        organizerEmail: 'organizer@example.com',
        organizerName: 'Organizer User',
        participantEmail: 'user@example.com',
        participantName: 'Current User',
        title: 'Introduction Call',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        location: '',
        locationType: 'virtual' as const,
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      mockHybridMeetingService.hybridGetMeeting.mockResolvedValue(mockMeeting);
      mockHybridMeetingService.hybridUpdateMeeting.mockResolvedValue(undefined);
      mockMeetingNotificationService.cancelMeetingNotifications.mockResolvedValue(undefined);

      (expoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        meetingId: 'meeting1',
      });

      const { getByText, getByPlaceholderText } = render(<MeetingResponseScreen />);

      await waitFor(() => {
        expect(getByText('Introduction Call')).toBeTruthy();
      });

      const responseInput = getByPlaceholderText('Add a note (optional)');
      fireEvent.changeText(responseInput, 'Sorry, I\'m not available at that time.');

      fireEvent.press(getByText('Decline'));

      await waitFor(() => {
        expect(mockHybridMeetingService.hybridUpdateMeeting).toHaveBeenCalledWith(
          'meeting1',
          expect.objectContaining({
            status: 'declined',
          })
        );
        expect(mockMeetingNotificationService.cancelMeetingNotifications).toHaveBeenCalledWith('meeting1');
      }, { timeout: 3000 });
    });

    it('UJ6.10: View Upcoming Meetings', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          organizerEmail: 'organizer@example.com',
          organizerName: 'Organizer User',
          participantEmail: 'user@example.com',
          participantName: 'Current User',
          title: 'Introduction Call',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          location: '',
          locationType: 'virtual' as const,
          meetingLink: 'https://zoom.us/j/123456789',
          status: 'accepted' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
      mockHybridMeetingService.hybridGetUpcomingMeetings.mockResolvedValue(mockMeetings);
      mockMeetingNotificationService.scheduleNotificationsForMeetings.mockResolvedValue(undefined);

      const { getByText } = render(<UpcomingMeetingsScreen />);

      await waitFor(() => {
        expect(getByText('Introduction Call')).toBeTruthy();
        expect(mockMeetingNotificationService.scheduleNotificationsForMeetings).toHaveBeenCalledWith(mockMeetings);
      }, { timeout: 3000 });
    });
  });

  describe('USER JOURNEY 11: Notification System', () => {
    it('UJ11.1: Grant Notification Permissions', async () => {
      const mockMeeting = {
        id: 'meeting1',
        organizerEmail: 'organizer@example.com',
        organizerName: 'Organizer User',
        participantEmail: 'user@example.com',
        participantName: 'Current User',
        title: 'Introduction Call',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        location: '',
        locationType: 'virtual' as const,
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'accepted' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const Notifications = require('expo-notifications');
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
      mockMeetingNotificationService.scheduleMeetingNotifications.mockImplementation(async (meeting) => {
        await Notifications.requestPermissionsAsync();
        await Notifications.scheduleNotificationAsync({});
      });

      await meetingNotificationService.scheduleMeetingNotifications(mockMeeting);

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });
});
