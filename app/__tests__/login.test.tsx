import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../login';
import * as expoRouter from 'expo-router';
import { initializeTestAccounts, getTestAccount } from '../../utils/testAccounts';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LoginScreen', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    await initializeTestAccounts();
  });

  it('should render login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Log in to continue')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should successfully login with test account t0', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    const userData = await AsyncStorage.getItem('user');
    expect(userData).toBeTruthy();
    const user = JSON.parse(userData || '{}');
    expect(user.email).toBe('t0');
    expect(user.isTestAccount).toBe(true);

    const profile = await AsyncStorage.getItem('profile');
    expect(profile).toBeTruthy();
  });

  it('should successfully login with test account t1', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't1');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  it('should show error for invalid test account password', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid email or password');
    });
  });

  it('should successfully login with regular user account', async () => {
    // Create a regular user account
    const userData = {
      email: 'regular@example.com',
      password: 'password123',
      id: '123',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.setItem('profile', JSON.stringify({ name: 'Regular User' }));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'regular@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  it('should navigate to profile creation if user has no profile', async () => {
    const userData = {
      email: 'noprofile@example.com',
      password: 'password123',
      id: '456',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'noprofile@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
    });
  });

  it('should show error for non-existent account', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'nonexistent@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No account found. Please sign up first.');
    });
  });

  it('should show error for wrong password', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'correctpassword',
      id: '789',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid email or password');
    });
  });

  it('should navigate to signup screen', () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Don't have an account? Sign Up"));

    expect(mockRouter.push).toHaveBeenCalledWith('/signup');
  });

  it('should show loading state during login', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 't0');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123');
    fireEvent.press(getByText('Log In'));

    // Button should show loading text
    await waitFor(() => {
      expect(getByText('Logging in...')).toBeTruthy();
    });
  });

  it('should handle errors gracefully', async () => {
    const originalGetItem = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn(() => Promise.reject(new Error('Storage error')));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to log in. Please try again.');
    });

    AsyncStorage.getItem = originalGetItem;
  });
});
