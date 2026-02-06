/**
 * Add to Calendar Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import AddToCalendarScreen from '../meeting/add-to-calendar';
import { hybridGetMeeting } from '@/services/hybridMeetingService';

jest.mock('@/services/hybridMeetingService');
jest.mock('@/utils/logger');

const mockRouterInstance = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ meetingId: 'meeting123' })),
  useRouter: jest.fn(() => mockRouterInstance),
}));

const mockHybridGetMeeting = hybridGetMeeting as jest.MockedFunction<typeof hybridGetMeeting>;
const mockRequestCalendarPermissions = Calendar.requestCalendarPermissionsAsync as jest.MockedFunction<typeof Calendar.requestCalendarPermissionsAsync>;
const mockGetCalendars = Calendar.getCalendarsAsync as jest.MockedFunction<typeof Calendar.getCalendarsAsync>;
const mockCreateEvent = Calendar.createEventAsync as jest.MockedFunction<typeof Calendar.createEventAsync>;

describe('AddToCalendarScreen', () => {
  const meeting = {
    id: 'meeting123',
    organizerEmail: 'a@example.com',
    organizerName: 'A',
    participantEmail: 'b@example.com',
    participantName: 'B',
    title: 'Test Meeting',
    description: 'Desc',
    date: '2026-02-15T10:00:00Z',
    time: '2026-02-15T10:00:00Z',
    duration: 60,
    locationType: 'virtual' as const,
    meetingLink: 'https://zoom.us/j/123',
    location: '',
    status: 'accepted' as const,
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockHybridGetMeeting.mockResolvedValue(meeting as any);
    mockRequestCalendarPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetCalendars.mockResolvedValue([{ id: 'default', allowsModifications: true }] as any);
    mockCreateEvent.mockResolvedValue('event-id');
  });

  it('should allow leaving without adding (Cancel/back)', async () => {
    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Cancel'));
    expect(mockRouterInstance.back).toHaveBeenCalled();
  });

  it('should add to phone calendar', async () => {
    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Add to phone calendar'));

    await waitFor(() => {
      expect(mockRequestCalendarPermissions).toHaveBeenCalled();
      expect(mockGetCalendars).toHaveBeenCalled();
      expect(mockCreateEvent).toHaveBeenCalled();
    });
  });

  it('should not re-add if already added to calendar', async () => {
    await AsyncStorage.setItem('meetingCalendarAdded:meeting123', 'true');

    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Add to phone calendar'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Already Added',
        'This meeting is already in your calendar.'
      );
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });
  });

  it('should handle permission denied', async () => {
    await AsyncStorage.removeItem('meetingCalendarAdded:meeting123');
    mockRequestCalendarPermissions.mockResolvedValue({ status: 'denied' } as any);
    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Add to phone calendar'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Denied',
        'Calendar permission is required to add events to your calendar.'
      );
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });
  });

  it('should open Google Calendar', async () => {
    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Add to Google Calendar'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('calendar.google.com'));
    });
  });

  it('should open Outlook/Hotmail', async () => {
    const { getByLabelText, queryByText } = render(<AddToCalendarScreen />);
    await waitFor(() => expect(queryByText('Loading…')).toBeNull());
    fireEvent.press(getByLabelText('Add to Outlook Calendar'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('outlook.office.com'));
    });
  });
});

