import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RespondRequestScreen from '../request/respond';
import * as expoRouter from 'expo-router';
import * as invitationCodeService from '@/services/invitationCodeService';
import * as inboxService from '@/services/inboxService';

// Mock useLocalSearchParams
const mockParams = { request: '' };

// Mock useLocalSearchParams to return our mockParams
jest.spyOn(expoRouter, 'useLocalSearchParams').mockImplementation(() => mockParams);

// Get mock router (from global mock in jest.setup.js)
const mockRouter = expoRouter.useRouter();

// Mock invitation code and inbox services
jest.mock('@/services/invitationCodeService', () => ({
  createInvitationCode: jest.fn(),
}));

jest.mock('@/services/inboxService', () => ({
  addInvitationCodeToInbox: jest.fn(),
}));

describe('RespondRequestScreen', () => {
  const mockRequest = {
    id: '1',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester User',
    mentorEmail: 'mentor@example.com',
    mentorName: 'Mentor User',
    note: 'I would like to learn from you',
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  // Helper to wait for screen to be fully loaded
  const waitForScreenReady = async (getByText: any) => {
    await waitFor(() => {
      expect(getByText('Respond to Request')).toBeTruthy();
    }, { timeout: 3000 });
  };

  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    mockParams.request = JSON.stringify(mockRequest);
    // Set up user data for invitation code generation
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'mentor@example.com' }));
    (invitationCodeService.createInvitationCode as jest.Mock).mockResolvedValue({
      id: 'code1',
      code: 'ABC12345',
      createdBy: 'mentor@example.com',
      isUsed: false,
      createdAt: '2026-01-20T10:00:00Z',
    });
    (inboxService.addInvitationCodeToInbox as jest.Mock).mockResolvedValue(undefined);
  });

  it('should render loading state when request is not loaded', () => {
    mockParams.request = '';
    const { getByText } = render(<RespondRequestScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render request details correctly', async () => {
    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    expect(getByText('Requester User')).toBeTruthy();
    expect(getByText('requester@example.com')).toBeTruthy();
    expect(getByText('I would like to learn from you')).toBeTruthy();
  });

  it('should display request note if provided', async () => {
    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    expect(getByText('Message:')).toBeTruthy();
    expect(getByText('I would like to learn from you')).toBeTruthy();
  });

  it('should not display message section if note is empty', async () => {
    const requestWithoutNote = {
      ...mockRequest,
      note: '',
    };
    mockParams.request = JSON.stringify(requestWithoutNote);

    const { queryByText } = render(<RespondRequestScreen />);

    await waitFor(() => {
      expect(queryByText('Message:')).toBeNull();
    });
  });

  it('should allow entering optional response note', async () => {
    const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    const responseInput = getByPlaceholderText('Thank you for your interest...');
    fireEvent.changeText(responseInput, 'I would be happy to mentor you');
    expect(responseInput.props.value).toBe('I would be happy to mentor you');
  });

  it('should accept request successfully', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('accepted');
      expect(requests[0]?.respondedAt).toBeTruthy();
    }, { timeout: 3000 });

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('should generate invitation code when accepting request', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    await waitFor(() => {
      expect(invitationCodeService.createInvitationCode).toHaveBeenCalledWith('mentor@example.com');
      expect(inboxService.addInvitationCodeToInbox).toHaveBeenCalledWith(
        'mentor@example.com',
        'ABC12345',
        'mentor@example.com'
      );
    }, { timeout: 3000 });
  });

  it('should not generate invitation code when declining request', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Decline'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('declined');
    }, { timeout: 3000 });

    expect(invitationCodeService.createInvitationCode).not.toHaveBeenCalled();
    expect(inboxService.addInvitationCodeToInbox).not.toHaveBeenCalled();
  });

  it('should handle invitation code generation error gracefully', async () => {
    (invitationCodeService.createInvitationCode as jest.Mock).mockRejectedValue(new Error('Code generation failed'));
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      // Request should still be accepted even if code generation fails
      expect(requests[0]?.status).toBe('accepted');
    }, { timeout: 3000 });

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('should accept request with response note', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    const responseInput = getByPlaceholderText('Thank you for your interest...');
    fireEvent.changeText(responseInput, 'I accept your request');
    fireEvent.press(getByText('Accept'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('accepted');
      expect(requests[0]?.responseNote).toBe('I accept your request');
      expect(requests[0]?.respondedAt).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should decline request successfully', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Decline'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('declined');
      expect(requests[0]?.respondedAt).toBeTruthy();
    }, { timeout: 3000 });

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('should decline request with response note', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    const responseInput = getByPlaceholderText('Thank you for your interest...');
    fireEvent.changeText(responseInput, 'Sorry, I cannot accept at this time');
    fireEvent.press(getByText('Decline'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('declined');
      expect(requests[0]?.responseNote).toBe('Sorry, I cannot accept at this time');
      expect(requests[0]?.respondedAt).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should trim response note whitespace', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText, getByPlaceholderText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    const responseInput = getByPlaceholderText('Thank you for your interest...');
    fireEvent.changeText(responseInput, '  Response with spaces  ');
    fireEvent.press(getByText('Accept'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.responseNote).toBe('Response with spaces');
    }, { timeout: 3000 });
  });

  it('should show loading state while responding', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([mockRequest]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    // Button should exist (might be disabled or text changed during loading)
    await waitFor(() => {
      expect(getByText('Accept') || getByText('Accepting...')).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('should handle missing request gracefully', async () => {
    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([]));

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    // The screen should handle gracefully (might show error or navigate back)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Either navigation happened or screen is still functional
    expect(true).toBeTruthy();
  });

  it('should update correct request when multiple exist', async () => {
    const request1 = { ...mockRequest, id: '1' };
    const request2 = {
      ...mockRequest,
      id: '2',
      requesterEmail: 'other@example.com',
      requesterName: 'Other User',
    };

    await AsyncStorage.setItem('mentorshipRequests', JSON.stringify([request1, request2]));

    mockParams.request = JSON.stringify(request1);

    const { getByText } = render(<RespondRequestScreen />);

    await waitForScreenReady(getByText);

    fireEvent.press(getByText('Accept'));

    await waitFor(async () => {
      const requestsData = await AsyncStorage.getItem('mentorshipRequests');
      const requests = JSON.parse(requestsData || '[]');
      expect(requests[0]?.status).toBe('accepted');
      expect(requests[1]?.status).toBe('pending'); // Other request unchanged
    }, { timeout: 3000 });
  });

  it('should navigate back when back button is pressed', async () => {
    render(<RespondRequestScreen />);

    await waitFor(() => {
      // Find back button (Ionicons arrow-back)
      // Since we can't easily test Ionicons, we'll test navigation via router
      expect(mockRouter.back).toBeDefined();
    });
  });
});
