/**
 * Upcoming Meetings Screen Tests (post Add-to-Calendar navigation change)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpcomingMeetingsScreen from '../meeting/upcoming';
import { hybridGetUpcomingMeetings } from '@/services/hybridMeetingService';
import { Meeting } from '@/types/types';

jest.mock('@/services/hybridMeetingService');
jest.mock('@/services/meetingNotificationService', () => ({
  scheduleNotificationsForMeetings: jest.fn(),
}));
jest.mock('@/utils/logger');

const mockRouterInstance = {
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouterInstance),
  useFocusEffect: jest.fn((callback) => {
    Promise.resolve().then(() => callback());
  }),
}));

const mockHybridGetUpcomingMeetings = hybridGetUpcomingMeetings as jest.MockedFunction<typeof hybridGetUpcomingMeetings>;

describe('UpcomingMeetingsScreen', () => {
  const mockUser = { email: 'test@example.com' };

  const mockMeetings: Meeting[] = [
    {
      id: 'meeting1',
      organizerEmail: 'test@example.com',
      organizerName: 'Test User',
      participantEmail: 'mentor@example.com',
      participantName: 'John Mentor',
      title: 'Career Planning',
      description: 'Discuss career goals',
      date: '2026-02-15T10:00:00Z',
      time: '2026-02-15T10:00:00Z',
      duration: 60,
      location: '',
      locationType: 'virtual',
      meetingLink: 'https://zoom.us/j/123456',
      status: 'accepted',
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    },
    {
      id: 'meeting2',
      organizerEmail: 'mentee@example.com',
      organizerName: 'Jane Mentee',
      participantEmail: 'test@example.com',
      participantName: 'Test User',
      title: 'Code Review',
      description: undefined,
      date: new Date(Date.now() + 86400000).toISOString(),
      time: new Date(Date.now() + 86400000).toISOString(),
      duration: 30,
      location: 'Starbucks',
      locationType: 'in-person',
      status: 'accepted',
      createdAt: '2026-01-21T10:00:00Z',
      updatedAt: '2026-01-21T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    await AsyncStorage.clear();
    await AsyncStorage.setItem('user', JSON.stringify(mockUser));
    mockHybridGetUpcomingMeetings.mockResolvedValue(mockMeetings);
  });

  it('should render upcoming meetings screen', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);
    await waitFor(() => expect(getByText('Upcoming Meetings')).toBeTruthy());
  });

  it('should display upcoming meetings list', async () => {
    const { findByText } = render(<UpcomingMeetingsScreen />);
    expect(await findByText('Career Planning')).toBeTruthy();
    expect(await findByText('Code Review')).toBeTruthy();
    expect(await findByText('https://zoom.us/j/123456')).toBeTruthy();
    expect(await findByText('Starbucks')).toBeTruthy();
  });

  it('should show empty state when no meetings', async () => {
    mockHybridGetUpcomingMeetings.mockResolvedValue([]);
    const { getByText } = render(<UpcomingMeetingsScreen />);
    await waitFor(() => {
      expect(getByText('No Upcoming Meetings')).toBeTruthy();
    });
  });

  it('should navigate to Add to Calendar screen when tapping calendar icon', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);
    await waitFor(() => {
      expect(getAllByLabelText('Add to calendar').length).toBeGreaterThan(0);
    });

    const buttons = getAllByLabelText('Add to calendar');
    fireEvent.press(buttons[0]);

    expect(mockRouterInstance.push).toHaveBeenCalledWith({
      pathname: '/meeting/add-to-calendar',
      params: { meetingId: 'meeting1' },
    });
  });

  it('should redirect to login if not authenticated', async () => {
    await AsyncStorage.removeItem('user');
    render(<UpcomingMeetingsScreen />);
    await waitFor(() => {
      expect(mockRouterInstance.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle load error gracefully', async () => {
    mockHybridGetUpcomingMeetings.mockRejectedValue(new Error('Network error'));
    render(<UpcomingMeetingsScreen />);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load upcoming meetings');
    });
  });

  it('should go back when pressing back button', async () => {
    const { getByLabelText } = render(<UpcomingMeetingsScreen />);
    await waitFor(() => {
      fireEvent.press(getByLabelText('Go back'));
    });
    expect(mockRouterInstance.back).toHaveBeenCalled();
  });
});

