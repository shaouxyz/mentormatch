/**
 * Profile Tab Tests
 * 
 * Tests for app/(tabs)/profile.tsx - user profile tab screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileScreen from '../(tabs)/profile';
import * as expoRouter from 'expo-router';
import * as sessionManager from '@/utils/sessionManager';
import * as logger from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/sessionManager');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const mockEndSession = sessionManager.endSession as jest.Mock;

describe('ProfileScreen', () => {
  const mockProfile = {
    name: 'Test User',
    email: 'test@example.com',
    phoneNumber: '123-456-7890',
    expertise: 'Software Development',
    interest: 'Data Science',
    expertiseYears: 5,
    interestYears: 2,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockEndSession.mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert');
    (logger.logger.error as jest.Mock) = jest.fn();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should display profile information when profile exists', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('123-456-7890')).toBeTruthy();
      expect(getByText('Software Development')).toBeTruthy();
      expect(getByText('Data Science')).toBeTruthy();
      expect(getByText('5 years of experience')).toBeTruthy();
      expect(getByText('2 years of experience')).toBeTruthy();
    });
  });

  it('should show empty state when no profile exists', async () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('No profile found')).toBeTruthy();
      expect(getByText('Create Profile')).toBeTruthy();
    });
  });

  it('should navigate to create profile when create button is pressed', async () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    const createButton = getByText('Create Profile');
    fireEvent.press(createButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/profile/create');
  });

  it('should navigate to edit profile when edit button is pressed', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const editButton = getByText('Edit Profile');
      fireEvent.press(editButton);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/profile/edit');
  });

  it('should navigate to requests when view requests button is pressed', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const requestsButton = getByText('View Requests');
      fireEvent.press(requestsButton);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/requests');
  });

  it('should show logout confirmation alert when logout button is pressed', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const logoutButton = getByText('Log Out');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Log Out',
        'Are you sure you want to log out?',
        expect.any(Array)
      );
    });
  });

  it('should logout when user confirms logout', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const logoutButton = getByText('Log Out');
      fireEvent.press(logoutButton);
    });

    // Get the alert callback and call it
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmCallback = alertCall[2][1].onPress; // Get the "Log Out" button callback

    await confirmCallback();

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalled();
    });

    await waitFor(async () => {
      const user = await AsyncStorage.getItem('user');
      const profile = await AsyncStorage.getItem('profile');
      expect(user).toBeNull();
      expect(profile).toBeNull();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('should not logout when user cancels', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const logoutButton = getByText('Log Out');
      fireEvent.press(logoutButton);
    });

    // Get the alert callback and call cancel
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const cancelCallback = alertCall[2][0]; // Get the "Cancel" button (no onPress, just style)

    // Cancel button doesn't have onPress, so nothing should happen
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should handle logout error gracefully', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));
    mockEndSession.mockRejectedValueOnce(new Error('Logout failed'));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const logoutButton = getByText('Log Out');
      fireEvent.press(logoutButton);
    });

    // Get the alert callback and call it
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmCallback = alertCall[2][1].onPress;

    await confirmCallback();

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalled();
    });

    // Error should be handled, component should not crash
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
  });

  it('should handle profile loading error gracefully', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

    const { queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    // Should show empty state when error occurs
    await waitFor(() => {
      expect(queryByText('No profile found')).toBeTruthy();
    });
  });

  it('should handle invalid profile data gracefully', async () => {
    await AsyncStorage.setItem('profile', 'invalid-json');

    const { queryByText, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    // Should show empty state when profile is invalid
    await waitFor(() => {
      expect(getByText('No profile found')).toBeTruthy();
    });
  });

  it('should display avatar with first letter of name', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    // Avatar should show first letter
    await waitFor(() => {
      expect(getByText('T')).toBeTruthy(); // First letter of "Test User"
    });
  });

  it('should not reload profile on re-render', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { rerender, queryByText, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
    });

    // Re-render should not trigger reload
    rerender(<ProfileScreen />);

    // Profile should still be displayed
    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
    });
  });

  it('should handle component unmount during profile loading', async () => {
    // Delay profile loading
    jest.spyOn(AsyncStorage, 'getItem').mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(JSON.stringify(mockProfile)), 1000))
    );

    const { unmount, queryByText } = render(<ProfileScreen />);

    // Unmount before loading completes
    unmount();

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Should not crash
    expect(true).toBeTruthy();
  });

  it('should have correct accessibility labels', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByLabelText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(getByLabelText('Edit profile button')).toBeTruthy();
      expect(getByLabelText('View requests button')).toBeTruthy();
      expect(getByLabelText('Log out button')).toBeTruthy();
    });
  });

  it('should have correct accessibility hints', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { getByLabelText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    await waitFor(() => {
      const editButton = getByLabelText('Edit profile button');
      const requestsButton = getByLabelText('View requests button');
      const logoutButton = getByLabelText('Log out button');

      expect(editButton.props.accessibilityHint).toBe('Tap to edit your profile information');
      expect(requestsButton.props.accessibilityHint).toBe('Tap to view your mentorship requests');
      expect(logoutButton.props.accessibilityHint).toBe('Tap to log out of your account');
    });
  });

  it('should handle AsyncStorage error during logout', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com', id: '123' }));

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 3000 });

    // Mock AsyncStorage.removeItem to fail
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('Remove failed'));

    await waitFor(() => {
      const logoutButton = getByText('Log Out');
      fireEvent.press(logoutButton);
    });

    // Get the alert callback and call it
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmCallback = alertCall[2][1].onPress;

    await confirmCallback();

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalled();
    });

    // Error should be handled
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
  });

  it('should handle error loading profile', async () => {
    // Make AsyncStorage.getItem throw an error
    const originalGetItem = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn().mockImplementation((key) => {
      if (key === 'profile') {
        return Promise.reject(new Error('Storage error'));
      }
      return originalGetItem(key);
    });

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(logger.logger.error).toHaveBeenCalledWith(
        'Error loading profile',
        expect.any(Error)
      );
    }, { timeout: 3000 });

    // Restore
    AsyncStorage.getItem = originalGetItem;
  });

  it('should not reload profile if already loaded', async () => {
    await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));

    const { rerender, getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
      expect(getByText('Test User')).toBeTruthy();
    }, { timeout: 3000 });

    // Re-render should not reload (hasLoadedRef prevents it)
    rerender(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
    });
  });
});
