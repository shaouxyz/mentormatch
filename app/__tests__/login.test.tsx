import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../login';
import * as expoRouter from 'expo-router';
import { initializeTestAccounts } from '../../utils/testAccounts';

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
    // Email is normalized to t0@example.com
    expect(user.email).toBe('t0@example.com');
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
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });
  });

  it('should successfully login with regular user account', async () => {
    // Create a regular user account with hashed password
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'regular@example.com',
      passwordHash: passwordHash,
      id: '123',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));
    
    const profile = {
      name: 'Regular User',
      email: 'regular@example.com',
      expertise: 'Test',
      interest: 'Test',
      expertiseYears: 5,
      interestYears: 2,
      phoneNumber: '+1234567890'
    };
    // Login checks for 'profile' key after setting current user
    await AsyncStorage.setItem('profile', JSON.stringify(profile));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'regular@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    }, { timeout: 3000 });
  });

  it('should navigate to profile creation if user has no profile', async () => {
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('password123');
    
    const users = [{
      email: 'noprofile@example.com',
      passwordHash: passwordHash,
      id: '456',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

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
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });
  });

  it('should show error for wrong password', async () => {
    const { hashPassword } = require('../../utils/security');
    const passwordHash = await hashPassword('correctpassword');
    
    const users = [{
      email: 'test@example.com',
      passwordHash: passwordHash,
      id: '789',
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
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
      // Error message now includes rate limiting info
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        expect.stringContaining('Invalid email or password'),
        expect.any(Array)
      );
    });

    AsyncStorage.getItem = originalGetItem;
  });
});
