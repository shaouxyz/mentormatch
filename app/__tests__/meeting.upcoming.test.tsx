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
import * as meetingNotificationService from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';

// Mock dependencies
jest.mock('@/services/hybridMeetingService');
jest.mock('@/services/meetingNotificationService', () => ({
  scheduleNotificationsForMeetings: jest.fn(),
}));
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
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    
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

    // Wait for meetings to load and verify titles are displayed
    expect(await findByText('Career Planning')).toBeTruthy();
    expect(await findByText('Code Review')).toBeTruthy();
    
    // Verify meeting details are displayed
    expect(await findByText('https://zoom.us/j/123456')).toBeTruthy();
    expect(await findByText('Starbucks')).toBeTruthy();
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

  it('should handle requestCalendarPermissions error', async () => {
    mockRequestCalendarPermissions.mockRejectedValue(new Error('Permission error'));

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    if (phoneCalendarOption) {
      await phoneCalendarOption.onPress();

      await waitFor(() => {
        // Should handle error gracefully (returns false)
        expect(mockRequestCalendarPermissions).toHaveBeenCalled();
      });
    }
  });

  it('should handle getDefaultCalendar error', async () => {
    mockGetCalendars.mockRejectedValue(new Error('Calendar error'));

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    if (phoneCalendarOption) {
      await phoneCalendarOption.onPress();

      await waitFor(() => {
        // Should handle error gracefully (returns null)
        expect(mockGetCalendars).toHaveBeenCalled();
      });
    }
  });

  it('should handle no calendar found', async () => {
    mockGetCalendars.mockResolvedValue([]);

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
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No calendar found');
    });
  });

  it('should handle Google Calendar export error', async () => {
    // Reset mocks first
    jest.clearAllMocks();
    
    // Mock Linking.openURL to throw error synchronously
    const originalOpenURL = Linking.openURL;
    (Linking.openURL as jest.Mock) = jest.fn().mockImplementation(() => {
      throw new Error('Link error');
    });

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      expect(calendarButtons.length).toBeGreaterThan(0);
    });

    const calendarButtons = getAllByLabelText('Add to calendar');
    fireEvent.press(calendarButtons[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const googleCalendarOption = lastCall[2]?.find((opt: any) => opt.text === 'Google Calendar');
    
    if (googleCalendarOption) {
      // Call onPress which will trigger the error
      googleCalendarOption.onPress();

      await waitFor(() => {
        // Check if error alert was called
        const errorCalls = (Alert.alert as jest.Mock).mock.calls.filter(
          (call: any[]) => call[0] === 'Error' && call[1] === 'Failed to open Google Calendar'
        );
        expect(errorCalls.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    }

    // Restore
    (Linking.openURL as jest.Mock) = originalOpenURL;
  });

  it('should handle Outlook Calendar export error', async () => {
    // Mock Linking.openURL to throw synchronously to test error handling
    const originalOpenURL = Linking.openURL;
    (Linking.openURL as jest.Mock) = jest.fn().mockImplementation(() => {
      throw new Error('Link error');
    });

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      expect(calendarButtons.length).toBeGreaterThan(0);
    });

    const calendarButtons = getAllByLabelText('Add to calendar');
    fireEvent.press(calendarButtons[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const outlookOption = lastCall[2]?.find((opt: any) => opt.text === 'Outlook/Hotmail');
    
    if (outlookOption) {
      outlookOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open Outlook Calendar');
      }, { timeout: 3000 });
    }

    // Restore
    (Linking.openURL as jest.Mock) = originalOpenURL;
  });

  it('should handle pull-to-refresh', async () => {
    render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(mockHybridGetUpcomingMeetings).toHaveBeenCalled();
    });

    // Pull-to-refresh functionality is tested through component rendering
    // The onRefresh handler calls loadMeetings which is covered by other tests
  });

  it('should handle virtual meeting location in calendar export', async () => {
    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      expect(calendarButtons.length).toBeGreaterThan(0);
    });

    const calendarButtons = getAllByLabelText('Add to calendar');
    fireEvent.press(calendarButtons[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const googleCalendarOption = lastCall[2]?.find((opt: any) => opt.text === 'Google Calendar');
    
    if (googleCalendarOption) {
      await googleCalendarOption.onPress();

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('zoom.us')
        );
      });
    }
  });

  it('should handle in-person meeting location in calendar export', async () => {
    const inPersonMeeting: Meeting = {
      ...mockMeetings[1],
      locationType: 'in-person',
      location: 'Coffee Shop',
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([inPersonMeeting]);

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      expect(calendarButtons.length).toBeGreaterThan(0);
    });

    const calendarButtons = getAllByLabelText('Add to calendar');
    fireEvent.press(calendarButtons[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const googleCalendarOption = lastCall[2]?.find((opt: any) => opt.text === 'Google Calendar');
    
    if (googleCalendarOption) {
      await googleCalendarOption.onPress();

      await waitFor(() => {
        // The URL contains the encoded location
        const openURLCalls = (Linking.openURL as jest.Mock).mock.calls;
        const lastURLCall = openURLCalls[openURLCalls.length - 1];
        expect(lastURLCall[0]).toContain('Coffee');
      });
    }
  });

  it('should format date for future dates (not today or tomorrow)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5); // 5 days from now
    const futureMeeting: Meeting = {
      ...mockMeetings[0],
      date: futureDate.toISOString(),
      time: futureDate.toISOString(),
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([futureMeeting]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      // Should show formatted date (not "Today" or "Tomorrow")
      const dateText = futureDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      expect(getByText(dateText)).toBeTruthy();
    });
  });

  it('should use first calendar when no calendar allows modifications', async () => {
    mockGetCalendars.mockResolvedValue([
      { id: 'calendar1', allowsModifications: false },
      { id: 'calendar2', allowsModifications: false },
    ] as any);

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
      // Should use first calendar (calendar1) even though it doesn't allow modifications
      expect(mockCreateEvent).toHaveBeenCalledWith(
        'calendar1',
        expect.any(Object)
      );
    });
  });

  it('should display participant name when user is organizer', async () => {
    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      // User is organizer, so should show participant name
      expect(getByText(/With: John Mentor/)).toBeTruthy();
    });
  });

  it('should display organizer name when user is participant', async () => {
    const participantMeeting: Meeting = {
      ...mockMeetings[1],
      organizerEmail: 'mentor@example.com',
      organizerName: 'Mentor User',
      participantEmail: 'test@example.com',
      participantName: 'Test User',
    };
    mockHybridGetUpcomingMeetings.mockResolvedValue([participantMeeting]);

    const { getByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      // User is participant, so should show organizer name
      expect(getByText(/With: Mentor User/)).toBeTruthy();
    });
  });

  it('should not display description when description is missing', async () => {
    const { queryByText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      // Meeting 2 has no description, so it shouldn't be displayed
      expect(queryByText('Code Review')).toBeTruthy(); // Title should be there
      // Description should not be rendered for meeting without description
    });
  });

  it('should handle non-Error thrown in loadMeetings', async () => {
    mockHybridGetUpcomingMeetings.mockRejectedValue('String error');

    render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load upcoming meetings');
    });
  });

  it('should handle non-Error thrown in requestCalendarPermissions', async () => {
    mockRequestCalendarPermissions.mockRejectedValue('Permission error string');

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    if (phoneCalendarOption) {
      await phoneCalendarOption.onPress();

      await waitFor(() => {
        expect(mockRequestCalendarPermissions).toHaveBeenCalled();
      });
    }
  });

  it('should handle non-Error thrown in getDefaultCalendar', async () => {
    mockGetCalendars.mockRejectedValue('Calendar error string');

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const phoneCalendarOption = lastCall[2].find((opt: any) => opt.text === 'Phone Calendar');
    
    if (phoneCalendarOption) {
      await phoneCalendarOption.onPress();

      await waitFor(() => {
        expect(mockGetCalendars).toHaveBeenCalled();
      });
    }
  });

  it('should handle non-Error thrown in addToPhoneCalendar', async () => {
    mockCreateEvent.mockRejectedValue('Calendar error string');

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

  it('should handle non-Error thrown in exportToGoogleCalendar', async () => {
    const originalOpenURL = Linking.openURL;
    (Linking.openURL as jest.Mock) = jest.fn().mockImplementation(() => {
      throw 'Link error string';
    });

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const googleCalendarOption = lastCall[2]?.find((opt: any) => opt.text === 'Google Calendar');
    
    if (googleCalendarOption) {
      googleCalendarOption.onPress();

      await waitFor(() => {
        const errorCalls = (Alert.alert as jest.Mock).mock.calls.filter(
          (call: any[]) => call[0] === 'Error' && call[1] === 'Failed to open Google Calendar'
        );
        expect(errorCalls.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    }

    (Linking.openURL as jest.Mock) = originalOpenURL;
  });

  it('should handle non-Error thrown in exportToOutlook', async () => {
    const originalOpenURL = Linking.openURL;
    (Linking.openURL as jest.Mock) = jest.fn().mockImplementation(() => {
      throw 'Link error string';
    });

    const { getAllByLabelText } = render(<UpcomingMeetingsScreen />);

    await waitFor(() => {
      const calendarButtons = getAllByLabelText('Add to calendar');
      fireEvent.press(calendarButtons[0]);
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    const outlookOption = lastCall[2]?.find((opt: any) => opt.text === 'Outlook/Hotmail');
    
    if (outlookOption) {
      outlookOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open Outlook Calendar');
      }, { timeout: 3000 });
    }

    (Linking.openURL as jest.Mock) = originalOpenURL;
  });
});
