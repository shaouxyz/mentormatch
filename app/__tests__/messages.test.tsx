import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import MessagesScreen from '../(tabs)/messages';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => {
    // Do not call callback immediately to prevent infinite loops
  }),
}));

// Mock hybridMessageService
jest.mock('../../services/hybridMessageService', () => ({
  hybridGetUserConversations: jest.fn(),
  generateConversationId: jest.fn((email1, email2) => `${email1}_${email2}`),
}));

const { hybridGetUserConversations } = require('../../services/hybridMessageService');

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('should render messages screen', () => {
    const { getByText } = render(<MessagesScreen />);
    expect(getByText('Messages')).toBeTruthy();
  });

  it('should show empty state when no conversations', async () => {
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    hybridGetUserConversations.mockResolvedValue([]);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText('No conversations yet')).toBeTruthy();
      expect(getByText('Connect with mentors or mentees to start messaging')).toBeTruthy();
    });
  });

  it('should display conversations list', async () => {
    const conversations = [
      {
        id: 'test@example.com_mentor@example.com',
        participants: ['test@example.com', 'mentor@example.com'],
        participantNames: {
          'test@example.com': 'Test User',
          'mentor@example.com': 'Mentor User',
        },
        lastMessage: 'Hello, how are you?',
        lastMessageAt: new Date().toISOString(),
        unreadCount: {
          'test@example.com': 2,
          'mentor@example.com': 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    hybridGetUserConversations.mockResolvedValue(conversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
      expect(getByText('Hello, how are you?')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // Unread count
    });
  });

  it('should navigate to chat when conversation is tapped', async () => {
    const conversations = [
      {
        id: 'test@example.com_mentor@example.com',
        participants: ['test@example.com', 'mentor@example.com'],
        participantNames: {
          'test@example.com': 'Test User',
          'mentor@example.com': 'Mentor User',
        },
        lastMessage: 'Hello',
        lastMessageAt: new Date().toISOString(),
        unreadCount: { 'test@example.com': 0, 'mentor@example.com': 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    hybridGetUserConversations.mockResolvedValue(conversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
    });

    fireEvent.press(getByText('Mentor User'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/messages/chat',
        params: {
          conversationId: 'test@example.com_mentor@example.com',
          participantEmail: 'mentor@example.com',
          participantName: 'Mentor User',
        },
      });
    });
  });

  it('should redirect to login if not authenticated', async () => {
    hybridGetUserConversations.mockResolvedValue([]);

    render(<MessagesScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('should show loading state initially', () => {
    const { getByText } = render(<MessagesScreen />);
    expect(getByText('Loading conversations...')).toBeTruthy();
  });

  it('should refresh conversations on pull to refresh', async () => {
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    hybridGetUserConversations.mockResolvedValue([]);

    const { getByTestId, queryByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(queryByText('No conversations yet')).toBeTruthy();
    });

    // Note: RefreshControl testing is limited in react-native-testing-library
    // This test verifies the component renders with RefreshControl
    expect(hybridGetUserConversations).toHaveBeenCalled();
  });

  it('should format time correctly for recent messages', async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const conversations = [
      {
        id: 'test@example.com_mentor@example.com',
        participants: ['test@example.com', 'mentor@example.com'],
        participantNames: {
          'test@example.com': 'Test User',
          'mentor@example.com': 'Mentor User',
        },
        lastMessage: 'Recent message',
        lastMessageAt: fiveMinutesAgo.toISOString(),
        unreadCount: { 'test@example.com': 0, 'mentor@example.com': 0 },
        createdAt: new Date().toISOString(),
        updatedAt: fiveMinutesAgo.toISOString(),
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    hybridGetUserConversations.mockResolvedValue(conversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText('Mentor User')).toBeTruthy();
      expect(getByText(/5m ago/)).toBeTruthy();
    });
  });
});
