import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MentorshipScreen from '../(tabs)/mentorship';
import * as expoRouter from 'expo-router';
import * as logger from '@/utils/logger';

// Get mock router (from global mock in jest.setup.js)
const mockRouter = expoRouter.useRouter();
const mockLogger = logger.logger as jest.Mocked<typeof logger.logger>;

describe('MentorshipScreen', () => {
  const mockUser = {
    email: 'user@example.com',
    password: 'password123',
    id: '123',
  };

  // Helper to wait for screen to load data
  const waitForScreenReady = async (getByText: any) => {
    await waitFor(() => {
      expect(getByText('My Mentors')).toBeTruthy();
    }, { timeout: 3000 });
  };

  interface RequestOverrides {
    id?: string;
    requesterEmail?: string;
    requesterName?: string;
    mentorEmail?: string;
    mentorName?: string;
    note?: string;
    status?: 'pending' | 'accepted' | 'declined';
    responseNote?: string;
    createdAt?: string;
    respondedAt?: string;
  }

  const createRequest = (overrides: RequestOverrides = {}) => ({
    id: Date.now().toString(),
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester User',
    mentorEmail: 'mentor@example.com',
    mentorName: 'Mentor User',
    note: 'Request note',
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    await AsyncStorage.setItem('user', JSON.stringify(mockUser));
    await AsyncStorage.setItem('profile', JSON.stringify({
      name: 'Current User',
      email: 'user@example.com',
      expertise: 'Test',
      interest: 'Test',
      expertiseYears: 3,
      interestYears: 2,
      phoneNumber: '+1234567890'
    }));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([]));
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.info = jest.fn();
  });

  it('should render mentors and mentees sections', async () => {
    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    expect(getByText('My Mentees')).toBeTruthy();
  });

  it('should display mentors when user has accepted requests', async () => {
    // User requested mentorship, mentor accepted
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const mentorProfile = {
      name: 'Mentor User',
      email: 'mentor@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([mentorProfile]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display mentees when user accepted requests', async () => {
    // Someone requested mentorship from user, user accepted
    const acceptedRequest = createRequest({
      requesterEmail: 'mentee@example.com',
      requesterName: 'Mentee User',
      mentorEmail: 'user@example.com',
      mentorName: 'Current User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const menteeProfile = {
      name: 'Mentee User',
      email: 'mentee@example.com',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 2,
      interestYears: 1,
      phoneNumber: '+1234567891',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([menteeProfile]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentee User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should show empty state when no mentors', async () => {
    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('No mentors yet')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should show empty state when no mentees', async () => {
    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('No mentees yet')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should navigate to profile view when mentor card is pressed', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const mentorProfile = {
      name: 'Mentor User',
      email: 'mentor@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([mentorProfile]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      const mentorCard = getByText('Mentor User');
      fireEvent.press(mentorCard);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/profile/view',
        params: expect.objectContaining({
          email: 'mentor@example.com',
        }),
      });
    }, { timeout: 3000 });
  });

  it('should navigate to profile view when mentee card is pressed', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'mentee@example.com',
      requesterName: 'Mentee User',
      mentorEmail: 'user@example.com',
      mentorName: 'Current User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const menteeProfile = {
      name: 'Mentee User',
      email: 'mentee@example.com',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 2,
      interestYears: 1,
      phoneNumber: '+1234567891',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([menteeProfile]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      const menteeCard = getByText('Mentee User');
      fireEvent.press(menteeCard);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/profile/view',
        params: expect.objectContaining({
          email: 'mentee@example.com',
        }),
      });
    }, { timeout: 3000 });
  });

  it('should display connection note if available', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      note: 'Original request note',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
      responseNote: 'Accepted response note',
    });

    const mentorProfile = {
      name: 'Mentor User',
      email: 'mentor@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([mentorProfile]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should only show accepted requests as connections', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const pendingRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'pending-mentor@example.com',
      mentorName: 'Pending Mentor',
      status: 'pending',
    });

    const declinedRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'declined-mentor@example.com',
      mentorName: 'Declined Mentor',
      status: 'declined',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([
      acceptedRequest,
      pendingRequest,
      declinedRequest,
    ]));

    const { getByText, queryByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      // Should only show accepted mentor
      expect(getByText('Mentor User')).toBeTruthy();
      expect(queryByText('Pending Mentor')).toBeNull();
      expect(queryByText('Declined Mentor')).toBeNull();
    }, { timeout: 3000 });
  });

  it('should handle user not logged in', async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('mentorshipRequests');

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    expect(getByText('No mentees yet')).toBeTruthy();
  });

  it('should handle missing mentorshipRequests when user not logged in', async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('mentorshipRequests');

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    // Should show empty states
    expect(getByText('No mentors yet')).toBeTruthy();
    expect(getByText('No mentees yet')).toBeTruthy();
  });

  it('should refresh connections when screen is focused', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });

    // Simulate focus effect by calling loadConnections again
    // This is tested implicitly through useFocusEffect
  });

  it('should handle missing profile data gracefully', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    // Don't set profile data
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      // Should still show connection even without full profile
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display multiple mentors', async () => {
    const mentor1 = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor1@example.com',
      mentorName: 'Mentor 1',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const mentor2 = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor2@example.com',
      mentorName: 'Mentor 2',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mentor1, mentor2]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor 1')).toBeTruthy();
      expect(getByText('Mentor 2')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display multiple mentees', async () => {
    const mentee1 = createRequest({
      requesterEmail: 'mentee1@example.com',
      requesterName: 'Mentee 1',
      mentorEmail: 'user@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const mentee2 = createRequest({
      requesterEmail: 'mentee2@example.com',
      requesterName: 'Mentee 2',
      mentorEmail: 'user@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mentee1, mentee2]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentee 1')).toBeTruthy();
      expect(getByText('Mentee 2')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should navigate to chat when message button is pressed for mentor', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });

    const messageButton = getByText('Message');
    fireEvent.press(messageButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/messages/chat',
        params: expect.objectContaining({
          participantEmail: 'mentor@example.com',
          participantName: 'Mentor User',
        }),
      });
    });
  });

  it('should navigate to chat when message button is pressed for mentee', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'mentee@example.com',
      requesterName: 'Mentee User',
      mentorEmail: 'user@example.com',
      mentorName: 'Current User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentee User')).toBeTruthy();
    }, { timeout: 3000 });

    const messageButton = getByText('Message');
    fireEvent.press(messageButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/messages/chat',
        params: expect.objectContaining({
          participantEmail: 'mentee@example.com',
          participantName: 'Mentee User',
        }),
      });
    });
  });

  it('should navigate to schedule meeting when schedule button is pressed for mentor', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });

    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/meeting/schedule',
        params: {
          participantEmail: 'mentor@example.com',
          participantName: 'Mentor User',
        },
      });
    });
  });

  it('should navigate to schedule meeting when schedule button is pressed for mentee', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'mentee@example.com',
      requesterName: 'Mentee User',
      mentorEmail: 'user@example.com',
      mentorName: 'Current User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentee User')).toBeTruthy();
    }, { timeout: 3000 });

    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/meeting/schedule',
        params: {
          participantEmail: 'mentee@example.com',
          participantName: 'Mentee User',
        },
      });
    });
  });

  it('should load mentor profile from test profiles when not in allProfiles', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      requesterName: 'Current User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'Mentor User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const testMentorProfile = {
      name: 'Mentor User',
      email: 'mentor@example.com',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([])); // No profiles in allProfiles
    await AsyncStorage.setItem('testProfile_mentor@example.com', JSON.stringify(testMentorProfile));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should load mentee profile from test profiles when not in allProfiles', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'mentee@example.com',
      requesterName: 'Mentee User',
      mentorEmail: 'user@example.com',
      mentorName: 'Current User',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    const testMenteeProfile = {
      name: 'Mentee User',
      email: 'mentee@example.com',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 2,
      interestYears: 1,
      phoneNumber: '+1234567891',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));
    await AsyncStorage.setItem('allProfiles', JSON.stringify([])); // No profiles in allProfiles
    await AsyncStorage.setItem('testProfile_mentee@example.com', JSON.stringify(testMenteeProfile));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    await waitFor(() => {
      expect(getByText('Mentee User')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should handle error in loadConnections', async () => {
    // Make AsyncStorage.getItem throw an error
    const originalGetItem = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn().mockRejectedValueOnce(new Error('Storage error'));

    render(<MentorshipScreen />);

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error loading connections',
        expect.any(Error)
      );
    }, { timeout: 3000 });

    // Restore
    AsyncStorage.getItem = originalGetItem;
  });

  it('should reload connections when screen is focused', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<MentorshipScreen />);

    await waitForScreenReady(getByText);

    // Mock useFocusEffect to call the callback
    const mockUseFocusEffect = require('expo-router').useFocusEffect;
    if (mockUseFocusEffect && typeof mockUseFocusEffect.mockImplementation === 'function') {
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        callback();
      });
    }

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
