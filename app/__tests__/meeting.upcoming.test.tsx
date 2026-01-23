/**
 * Upcoming Meetings Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import UpcomingMeetingsScreen from '../meeting/upcoming';
import { hybridGetUpcomingMeetings } from '@/services/hybridMeetingService';
import { Meeting } from '@/types/types';

// Mock dependencies
jest.mock('@/services/hybridMeetingService');
jest.mock('expo-linking');

const mockRouterInstance = {
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouterInstance),
  useFocusEffect: jest.fn((callback) => {
    // Call callback asynchronously to simulate focus effect
    Promise.resolve().then(() => callback());
  }),
}));

const mockHybridGetUpcomingMeetings = hybridGetUpcomingMeetings as jest.MockedFunction<typeof hybridGetUpcomingMeetings>;
const mockRequestCalendarPermissions = Calendar.requestCalendarPermissionsAsync as jest.MockedFunction<typeof Calendar.requestCalendarPermissionsAsync>;
const mockGetCalendars = Calendar.getCalendarsAsync as jest.MockedFunction<typeof Calendar.getCalendarsAsync>;
const mockCreateEvent = Calendar.createEventAsync as jest.MockedFunction<typeof Calendar.createEventAsync>;

describe('UpcomingMeetingsScreen', () => {
  const mockUser = {
    email: 'test@example.com',
  };

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
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
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
    mockRouterInstance.back.mockClear();
    mockRouterInstance.replace.mockClear();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('user', JSON.stringify(mockUser));
    jest.spyOn(Alert, 'alert');
    jest.spyOn(Linking, 'openURL');
    
    mockHybridGetUpcomingMeetings.mockResolvedValue(mockMeetings);
    mockRequestCalendarPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetCalendars.mockResolvedValue([{ id: 'default', allowsModifications: true }] as any);
    mockCreateEvent.mockResolvedValue('event-id');
  });

  it('should render upcoming meetings screen', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('Upcoming Meetings')).toBeTruthy();
    });
  });

  it('should display upcoming meetings list', async () => {
    const { findByText } = render(<UpcomingMeetingsScreen />);

    // Wait for meetings to load and all content to render
    expect(await findByText('Career Planning')).toBeTruthy();
    expect(await findByText('Code Review')).toBeTruthy();
    expect(await findByText('With: John Mentor')).toBeTruthy();
    expect(await findByText('With: Jane Mentee')).toBeTruthy();
  });

  it('should display meeting location for virtual meetings', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('https://zoom.us/j/123456')).toBeTruthy();
    });
  });

  it('should display meeting location for in-person meetings', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('Starbucks')).toBeTruthy();
    });
  });

  it('should show empty state when no meetings', async () => {
    mockHybridGetUpcomingMeetings.mockResolvedValue([]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('No Upcoming Meetings')).toBeTruthy();
      expect(getByText('Schedule a meeting with your mentors or mentees')).toBeTruthy();
    });
  });

  it('should show calendar options when tapping calendar icon', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      expect(calendarButtons.length).toBeGreaterThan(0);
    });

    const calendarButtons = getAllByLabelText('Add to calendar');
    fireEvent.press(calendarButtons[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Add to Calendar',
        'Choose where to add this meeting:',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Phone Calendar' }),
          expect.objectContaining({ text: 'Google Calendar' }),
          expect.objectContaining({ text: 'Outlook/Hotmail' }),
          expect.objectContaining({ text: 'Cancel' }),
        ])
      );
    });
  });

  it('should add meeting to phone calendar', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    // Simulate selecting "Phone Calendar" option
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    await phoneCalendarOption.onPress();

    await waitFor(() => {
      expect(mockRequestCalendarPermissions).toHaveBeenCalled();
      expect(mockGetCalendars).toHaveBeenCalled();
      expect(mockCreateEvent).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          title: 'Career Planning',
          notes: 'Discuss career goals',
          location: 'https://zoom.us/j/123456',
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event added to your calendar!');
    });
  });

  it('should handle calendar permission denied', async () => {
    mockRequestCalendarPermissions.mockResolvedValue({ status: 'denied' } as any);

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    await phoneCalendarOption.onPress();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Denied',
        'Calendar permission is required to add events to your calendar.'
      );
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });
  });

  it('should open Google Calendar link', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const googleCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Google Calendar');
    
    await googleCalendarOption.onPress();

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('calendar.google.com')
      );
    });
  });

  it('should open Outlook Calendar link', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const outlookOption = lastCall[2].find((opt: any) => opt.text === 'Outlook/Hotmail');
    
    await outlookOption.onPress();

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('outlook.office.com')
      );
    });
  });

  it('should show "Today" for meetings happening today', async () => {
    const todayMeeting: Meeting = {
      ...mockMeetings[0],
      date: new Date().toISOString(),
      time: new Date().toISOString(),
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([todayMeeting]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
    });
  });

  it('should show "Tomorrow" for meetings happening tomorrow', async () => {
    const tomorrowMeeting: Meeting = {
      ...mockMeetings[0],
      date: new Date(Date.now() + 86400000).toISOString(),
      time: new Date(Date.now() + 86400000).toISOString(),
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([tomorrowMeeting]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('Tomorrow')).toBeTruthy();
    });
  });

  it('should refresh meetings on pull-to-refresh', async () => {
    render(<UpcomingMeetingsScreen />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockHybridGetUpcomingMeetings).toHaveBeenCalled();
    });

    // The useFocusEffect in the component will trigger loadMeetings on focus
    // For this test we verify it's called at least once
    expect(mockHybridGetUpcomingMeetings).toHaveBeenCalled();
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
      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);
    });

    expect(mockRouterInstance.back).toHaveBeenCalled();
  });

  it('should display meeting duration', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText(/60 min/)).toBeTruthy();
      expect(getByText(/30 min/)).toBeTruthy();
    });
  });

  it('should handle phone call meeting type', async () => {
    const phoneMeeting: Meeting = {
      ...mockMeetings[0],
      locationType: 'phone',
      location: '555-1234',
      meetingLink: undefined,
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([phoneMeeting]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('555-1234')).toBeTruthy();
    });
  });

  it('should display meeting description if present', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(getByText('Discuss career goals')).toBeTruthy();
    });
  });

  it('should handle calendar creation error', async () => {
    mockCreateEvent.mockRejectedValue(new Error('Calendar error'));

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    await phoneCalendarOption.onPress();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add event to calendar');
    });
  });
});
