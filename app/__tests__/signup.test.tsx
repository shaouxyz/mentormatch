import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignupScreen from '../signup';
import * as expoRouter from 'expo-router';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignupScreen', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('should render signup form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Sign up to start matching')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('should show error when email is empty', async () => {
    const { getByText } = render(<SignupScreen />);

    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should show error when password is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should show error when passwords do not match', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password456');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    });
  });

  it('should show error when password is too short', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '12345');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), '12345');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    });
  });

  it('should show error for invalid email format', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('should accept valid email formats', async () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user_name@example-domain.com',
    ];

    for (const email of validEmails) {
      const { getByText, getByPlaceholderText } = render(<SignupScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
      });

      jest.clearAllMocks();
    }
  });

  it('should successfully create account with valid data', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
    });

    const userData = await AsyncStorage.getItem('user');
    expect(userData).toBeTruthy();
    const user = JSON.parse(userData || '{}');
    expect(user.email).toBe('test@example.com');
    expect(user.password).toBe('password123');

    const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
    expect(isAuthenticated).toBe('true');
  });

  it('should show loading state during signup', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    // Button should show loading text
    await waitFor(() => {
      expect(getByText('Creating Account...')).toBeTruthy();
    });
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    // Mock AsyncStorage to throw error
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('Storage error')));

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to create account. Please try again.');
    });

    AsyncStorage.setItem = originalSetItem;
  });

  it('should navigate to login screen', () => {
    const { getByText } = render(<SignupScreen />);

    fireEvent.press(getByText("Already have an account? Log In"));

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('should update input values correctly', () => {
    const { getByPlaceholderText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const confirmPasswordInput = getByPlaceholderText('Confirm your password');

    fireEvent.changeText(emailInput, 'newemail@example.com');
    fireEvent.changeText(passwordInput, 'newpassword123');
    fireEvent.changeText(confirmPasswordInput, 'newpassword123');

    expect(emailInput.props.value).toBe('newemail@example.com');
    expect(passwordInput.props.value).toBe('newpassword123');
    expect(confirmPasswordInput.props.value).toBe('newpassword123');
  });
});
