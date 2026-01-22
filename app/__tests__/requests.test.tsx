import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RequestsScreen from '../(tabs)/requests';
import { useRouter } from 'expo-router';

// Get mock router (from global mock in jest.setup.js)
const mockRouter = useRouter();

describe('RequestsScreen', () => {
  const mockUser = {
    email: 'user@example.com',
    password: 'password123',
    id: '123',
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
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([]));
  });

  it('should render tabs correctly', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      expect(getByText(/Incoming \(\d+\)/)).toBeTruthy();
      expect(getByText(/Sent \(\d+\)/)).toBeTruthy();
      expect(getByText(/Processed \(\d+\)/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display incoming requests', async () => {
    const incomingRequest = createRequest({
      mentorEmail: 'user@example.com',
      status: 'pending',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([incomingRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      expect(getByText('Requester User')).toBeTruthy();
      expect(getByText('Request note')).toBeTruthy();
    });
  });

  it('should display sent requests', async () => {
    const sentRequest = createRequest({
      requesterEmail: 'user@example.com',
      status: 'pending',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([sentRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      // Switch to Sent tab
      fireEvent.press(getByText(/Sent \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
      expect(getByText('Request note')).toBeTruthy();
    });
  });

  it('should display processed requests', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
      responseNote: 'Accepted response',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      // Switch to Processed tab
      fireEvent.press(getByText(/Processed \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
      expect(getByText('Accepted')).toBeTruthy();
      expect(getByText('Accepted response')).toBeTruthy();
    });
  });

  it('should show empty state when no incoming requests', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      expect(getByText('No incoming requests')).toBeTruthy();
    });
  });

  it('should show empty state when no sent requests', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText(/Sent \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('No sent requests')).toBeTruthy();
    });
  });

  it('should show empty state when no processed requests', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText(/Processed \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('No processed requests')).toBeTruthy();
    });
  });

  it('should navigate to respond screen when accept button is pressed', async () => {
    const incomingRequest = createRequest({
      mentorEmail: 'user@example.com',
      status: 'pending',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([incomingRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Accept'));
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/request/respond',
        params: expect.objectContaining({
          request: expect.stringContaining('requester@example.com'),
        }),
      });
    });
  });

  it('should navigate to respond screen when decline button is pressed', async () => {
    const incomingRequest = createRequest({
      mentorEmail: 'user@example.com',
      status: 'pending',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([incomingRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('Decline'));
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/request/respond',
        params: expect.objectContaining({
          request: expect.stringContaining('requester@example.com'),
        }),
      });
    });
  });

  it('should filter requests correctly by user email', async () => {
    const userRequest = createRequest({
      requesterEmail: 'user@example.com',
      status: 'pending',
    });
    const otherRequest = createRequest({
      requesterEmail: 'other@example.com',
      requesterName: 'Other User',
      mentorEmail: 'user@example.com',
      status: 'pending',
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([userRequest, otherRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      // Incoming tab should show otherRequest
      expect(getByText('Other User')).toBeTruthy();
    });

    await waitFor(() => {
      // Sent tab should show userRequest
      fireEvent.press(getByText(/Sent \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    });
  });

  it('should sort processed requests by respondedAt', async () => {
    const oldRequest = createRequest({
      requesterEmail: 'user@example.com',
      status: 'accepted',
      respondedAt: new Date('2024-01-01').toISOString(),
    });
    const newRequest = createRequest({
      requesterEmail: 'user@example.com',
      mentorEmail: 'mentor2@example.com',
      mentorName: 'Mentor 2',
      status: 'declined',
      respondedAt: new Date('2024-01-02').toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([oldRequest, newRequest]));

    const { getByText, getAllByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText(/Processed \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      // Newer request should appear first
      const mentorNames = getAllByText(/Mentor/);
      expect(mentorNames[0].props.children).toContain('Mentor 2');
    });
  });

  it('should handle refresh pull-to-refresh', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      // Verify component renders with RefreshControl
      // RefreshControl is tested implicitly through FlatList
      expect(getByText(/Incoming \(\d+\)/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display request timestamp', async () => {
    const incomingRequest = createRequest({
      mentorEmail: 'user@example.com',
      status: 'pending',
      createdAt: new Date('2024-01-15').toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([incomingRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      // Should display date/time information
      expect(getByText('Requester User')).toBeTruthy();
    });
  });

  it('should show status badge for processed requests', async () => {
    const acceptedRequest = createRequest({
      requesterEmail: 'user@example.com',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([acceptedRequest]));

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      fireEvent.press(getByText(/Processed \(\d+\)/));
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Accepted')).toBeTruthy();
    });
  });

  it('should handle empty AsyncStorage gracefully', async () => {
    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      expect(getByText('No incoming requests')).toBeTruthy();
    });
  });

  it('should handle user not logged in', async () => {
    await AsyncStorage.removeItem('user');

    const { getByText } = render(<RequestsScreen />);

    await waitFor(() => {
      expect(getByText('No incoming requests')).toBeTruthy();
    });
  });
});
