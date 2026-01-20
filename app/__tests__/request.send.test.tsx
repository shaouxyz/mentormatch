import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendRequestScreen from '../request/send';
import * as expoRouter from 'expo-router';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock useLocalSearchParams
const mockParams = { profile: '' };
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: jest.fn(() => mockParams),
}));

jest.spyOn(Alert, 'alert');

describe('SendRequestScreen', () => {
  const mockProfile = {
    name: 'John Mentor',
    email: 'mentor@example.com',
    expertise: 'Software Development',
    interest: 'Data Science',
    expertiseYears: 5,
    interestYears: 2,
    phoneNumber: '+1234567890',
  };

  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    mockParams.profile = JSON.stringify(mockProfile);
    
    const userData = {
      email: 'requester@example.com',
      password: 'password123',
      id: '123',
    };
    const profileData = {
      name: 'Requester User',
      email: 'requester@example.com',
      expertise: 'Data Science',
      interest: 'Software Development',
      expertiseYears: 2,
      interestYears: 1,
      phoneNumber: '+1234567891',
    };

    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.setItem('profile', JSON.stringify(profileData));
  });

  it('should render request form correctly', async () => {
    const { getByText, getByPlaceholderText } = render(<SendRequestScreen />);

    await waitFor(() => {
      expect(getByText('Request Mentor')).toBeTruthy();
      expect(getByText('John Mentor')).toBeTruthy();
      expect(getByPlaceholderText("Hi! I'm interested in learning from you because...")).toBeTruthy();
      expect(getByText('Send Request')).toBeTruthy();
    });
  });

  it('should display mentor profile information', async () => {
    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      expect(getByText('John Mentor')).toBeTruthy();
      expect(getByText('Software Development')).toBeTruthy();
    });
  });

  it('should allow entering optional note', async () => {
    const { getByPlaceholderText } = render(<SendRequestScreen />);

    await waitFor(() => {
      const noteInput = getByPlaceholderText("Hi! I'm interested in learning from you because...");
      fireEvent.changeText(noteInput, 'I would like to learn from you');
      expect(noteInput.props.value).toBe('I would like to learn from you');
    });
  });

  it('should send request successfully without note', async () => {
    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request Sent',
        'Your mentorship request has been sent successfully!',
        expect.any(Array)
      );
    });

    // Verify request was saved
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    expect(requestsData).toBeTruthy();
    const requests = JSON.parse(requestsData || '[]');
    expect(requests.length).toBe(1);
    expect(requests[0].requesterEmail).toBe('requester@example.com');
    expect(requests[0].mentorEmail).toBe('mentor@example.com');
    expect(requests[0].status).toBe('pending');
    expect(requests[0].note).toBe('');
  });

  it('should send request successfully with note', async () => {
    const { getByText, getByPlaceholderText } = render(<SendRequestScreen />);

    await waitFor(() => {
      const noteInput = getByPlaceholderText("Hi! I'm interested in learning from you because...");
      fireEvent.changeText(noteInput, 'I am very interested in learning from you');
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request Sent',
        'Your mentorship request has been sent successfully!',
        expect.any(Array)
      );
    });

    // Verify request was saved with note
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    const requests = JSON.parse(requestsData || '[]');
    expect(requests[0].note).toBe('I am very interested in learning from you');
  });

  it('should prevent duplicate pending requests', async () => {
    // Create existing request
    const existingRequest = {
      id: '1',
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'John Mentor',
      note: 'Previous request',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([existingRequest]));

    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request Already Sent',
        'You have already sent a request to this person.'
      );
    });

    // Verify no new request was added
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    const requests = JSON.parse(requestsData || '[]');
    expect(requests.length).toBe(1);
  });

  it('should allow sending new request if previous was declined', async () => {
    // Create declined request
    const declinedRequest = {
      id: '1',
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester User',
      mentorEmail: 'mentor@example.com',
      mentorName: 'John Mentor',
      note: 'Previous request',
      status: 'declined' as const,
      createdAt: new Date().toISOString(),
      respondedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([declinedRequest]));

    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request Sent',
        'Your mentorship request has been sent successfully!',
        expect.any(Array)
      );
    });

    // Verify new request was added
    const requestsData = await AsyncStorage.getItem('mentorshipRequests');
    const requests = JSON.parse(requestsData || '[]');
    expect(requests.length).toBe(2);
    expect(requests[1].status).toBe('pending');
  });

  it('should show error when profile is missing', async () => {
    mockParams.profile = '';

    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to send request. Please try again.');
    });
  });

  it('should show error when current user is missing', async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('profile');

    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to send request. Please try again.');
    });
  });

  it('should show loading state while sending', async () => {
    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(getByText('Sending...')).toBeTruthy();
    });
  });

  it('should navigate back after successful request', async () => {
    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Simulate OK button press
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call) => call[0] === 'Request Sent'
    );
    if (alertCall && alertCall[2] && alertCall[2][0]) {
      alertCall[2][0].onPress();
    }

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  it('should trim note whitespace', async () => {
    const { getByText, getByPlaceholderText } = render(<SendRequestScreen />);

    await waitFor(() => {
      const noteInput = getByPlaceholderText("Hi! I'm interested in learning from you because...");
      fireEvent.changeText(noteInput, '  Note with spaces  ');
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0].note).toBe('Note with spaces');
    });
  });

  it('should create request with correct structure', async () => {
    const { getByText } = render(<SendRequestScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Send Request'));
    });

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      const request = requests[0];
      
      expect(request).toHaveProperty('id');
      expect(request).toHaveProperty('requesterEmail', 'requester@example.com');
      expect(request).toHaveProperty('requesterName', 'Requester User');
      expect(request).toHaveProperty('mentorEmail', 'mentor@example.com');
      expect(request).toHaveProperty('mentorName', 'John Mentor');
      expect(request).toHaveProperty('note', '');
      expect(request).toHaveProperty('status', 'pending');
      expect(request).toHaveProperty('createdAt');
    });
  });
});
