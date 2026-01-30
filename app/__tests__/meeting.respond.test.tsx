/**
 * Meeting Response Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MeetingResponseScreen from '../meeting/respond';
import { hybridGetMeeting, hybridUpdateMeeting } from '@/services/hybridMeetingService';
import * as meetingNotificationService from '@/services/meetingNotificationService';
import { Meeting } from '@/types/types';

// Mock dependencies
jest.mock('@/services/hybridMeetingService');
jest.mock('@/services/meetingNotificationService', () => ({
  scheduleMeetingNotifications: jest.fn(),
  cancelMeetingNotifications: jest.fn(),
}));

const mockRouterInstance = {
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({
    meetingId: 'meeting123',
  })),
  useRouter: jest.fn(() => mockRouterInstance),
}));

const mockHybridGetMeeting = hybridGetMeeting as jest.MockedFunction<typeof hybridGetMeeting>;
const mockHybridUpdateMeeting = hybridUpdateMeeting as jest.MockedFunction<typeof hybridUpdateMeeting>;

describe('MeetingResponseScreen', () => {
  const mockMeeting: Meeting = {
    id: 'meeting123',
    organizerEmail: 'organizer@example.com',
    organizerName: 'John Organizer',
    participantEmail: 'participant@example.com',
    participantName: 'Jane Participant',
    title: 'Introduction Call',
    description: 'Let\'s discuss your career goals',
    date: '2026-02-15T10:00:00Z',
    time: '2026-02-15T10:00:00Z',
    duration: 60,
    location: '',
    locationType: 'virtual',
    meetingLink: 'https://zoom.us/j/123456',
    status: 'pending',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterInstance.back.mockClear();
    mockRouterInstance.replace.mockClear();
    mockRouterInstance.push.mockClear();
    jest.spyOn(Alert, 'alert');
    mockHybridGetMeeting.mockResolvedValue(mockMeeting);
    mockHybridUpdateMeeting.mockResolvedValue();
  });

  it('should show loading state initially', () => {
    const { getByText } = render(<MeetingResponseScreen />);

    expect(getByText('Loading meeting details...')).toBeTruthy();
  });

  it('should render meeting details', async () => {
    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText('Introduction Call')).toBeTruthy();
    expect(getByText('John Organizer')).toBeTruthy();
    expect(getByText('organizer@example.com')).toBeTruthy();
    expect(getByText('https://zoom.us/j/123456')).toBeTruthy();
    expect(getByText('Let\'s discuss your career goals')).toBeTruthy();
  });

  it('should display formatted date', async () => {
    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText(/Sunday, February 15, 2026/i)).toBeTruthy();
  });

  it('should display formatted time with duration', async () => {
    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText(/60 minutes/)).toBeTruthy();
  });

  it('should show virtual meeting indicator', async () => {
    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText('Virtual Meeting')).toBeTruthy();
  });

  it('should show in-person meeting location', async () => {
    const inPersonMeeting: Meeting = {
      ...mockMeeting,
      locationType: 'in-person',
      location: 'Starbucks, 123 Main St',
      meetingLink: undefined,
    };
    mockHybridGetMeeting.mockResolvedValue(inPersonMeeting);

    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText('In-Person Meeting')).toBeTruthy();
    expect(getByText('Starbucks, 123 Main St')).toBeTruthy();
  });

  it('should show phone call location', async () => {
    const phoneMeeting: Meeting = {
      ...mockMeeting,
      locationType: 'phone',
      location: '555-1234',
      meetingLink: undefined,
    };
    mockHybridGetMeeting.mockResolvedValue(phoneMeeting);

    const { getByText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    expect(getByText('Phone Call')).toBeTruthy();
    expect(getByText('555-1234')).toBeTruthy();
  });

  it('should accept meeting', async () => {
    const { getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const acceptButton = getByLabelText('Accept meeting');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockHybridUpdateMeeting).toHaveBeenCalledWith(
        'meeting123',
        expect.objectContaining({
          status: 'accepted',
          respondedAt: expect.any(String),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Meeting accepted! It has been added to your calendar.',
        expect.any(Array)
      );
    });
  });

  it('should decline meeting', async () => {
    const { getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const declineButton = getByLabelText('Decline meeting');
    fireEvent.press(declineButton);

    await waitFor(() => {
      expect(mockHybridUpdateMeeting).toHaveBeenCalledWith(
        'meeting123',
        expect.objectContaining({
          status: 'declined',
          respondedAt: expect.any(String),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Meeting declined.',
        expect.any(Array)
      );
    });
  });

  it('should include response note when accepting', async () => {
    const { getByPlaceholderText, getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const noteInput = getByPlaceholderText('Add a note (optional)');
    fireEvent.changeText(noteInput, 'Looking forward to it!');

    const acceptButton = getByLabelText('Accept meeting');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockHybridUpdateMeeting).toHaveBeenCalledWith(
        'meeting123',
        expect.objectContaining({
          status: 'accepted',
          responseNote: 'Looking forward to it!',
        })
      );
    });
  });

  it('should include response note when declining', async () => {
    const { getByPlaceholderText, getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const noteInput = getByPlaceholderText('Add a note (optional)');
    fireEvent.changeText(noteInput, 'Sorry, I have a conflict');

    const declineButton = getByLabelText('Decline meeting');
    fireEvent.press(declineButton);

    await waitFor(() => {
      expect(mockHybridUpdateMeeting).toHaveBeenCalledWith(
        'meeting123',
        expect.objectContaining({
          status: 'declined',
          responseNote: 'Sorry, I have a conflict',
        })
      );
    });
  });

  it('should handle meeting not found', async () => {
    mockHybridGetMeeting.mockResolvedValue(null);

    const { queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Meeting not found');
      expect(mockRouterInstance.back).toHaveBeenCalled();
    });
  });

  it('should handle load error gracefully', async () => {
    mockHybridGetMeeting.mockRejectedValue(new Error('Network error'));

    const { queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load meeting details');
    });
  });

  it('should handle response error gracefully', async () => {
    mockHybridUpdateMeeting.mockRejectedValue(new Error('Network error'));

    const { getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const acceptButton = getByLabelText('Accept meeting');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to respond to meeting. Please try again.');
    });
  });

  it('should go back when pressing back button', async () => {
    const { getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockRouterInstance.back).toHaveBeenCalled();
  });

  it('should sanitize response note input', async () => {
    const { getByPlaceholderText, getByLabelText, queryByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(queryByText('Loading meeting details...')).toBeNull();
    });

    const noteInput = getByPlaceholderText('Add a note (optional)');
    fireEvent.changeText(noteInput, '<script>alert("xss")</script>Thanks!');

    const acceptButton = getByLabelText('Accept meeting');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockHybridUpdateMeeting).toHaveBeenCalledWith(
        'meeting123',
        expect.objectContaining({
          responseNote: expect.not.stringContaining('<script>'),
        })
      );
    });
  });

  // Coverage holes tests - Section 26.7
  it('should handle meeting load error (line 61)', async () => {
    mockHybridGetMeeting.mockRejectedValue(new Error('Meeting load failed'));

    render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    }, { timeout: 3000 });
  });

  it('should handle response submission errors (lines 83, 93, 109)', async () => {
    mockHybridGetMeeting.mockResolvedValue(mockMeeting);
    mockHybridUpdateMeeting.mockRejectedValue(new Error('Update failed'));

    const { getByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(getByText('Accept')).toBeTruthy();
    }, { timeout: 3000 });

    fireEvent.press(getByText('Accept'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    }, { timeout: 3000 });
  });

  it('should handle notification scheduling error on accept', async () => {
    mockHybridGetMeeting.mockResolvedValue(mockMeeting);
    mockHybridUpdateMeeting.mockResolvedValue({ ...mockMeeting, status: 'accepted' });
    const mockScheduleNotifications = meetingNotificationService.scheduleMeetingNotifications as jest.Mock;
    mockScheduleNotifications.mockRejectedValue(new Error('Notification failed'));

    const { getByText } = render(<MeetingResponseScreen />);

    await waitFor(() => {
      expect(getByText('Accept')).toBeTruthy();
    }, { timeout: 3000 });

    fireEvent.press(getByText('Accept'));

    await waitFor(() => {
      // Should still succeed even if notifications fail
      expect(mockHybridUpdateMeeting).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
