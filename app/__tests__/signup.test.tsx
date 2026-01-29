import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignupScreen from '../signup';
import * as expoRouter from 'expo-router';
import * as invitationCodeService from '@/services/invitationCodeService';
import * as validation from '@/utils/validation';
import { ErrorHandler } from '@/utils/errorHandler';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock invitation code service
jest.mock('@/services/invitationCodeService', () => ({
  isValidInvitationCode: jest.fn(),
  useInvitationCode: jest.fn(),
}));

describe('SignupScreen', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('should render signup form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Sign up to start matching')).toBeTruthy();
    expect(getByPlaceholderText('Enter invitation code')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('should show error when invitation code is empty', async () => {
    const { getByText } = render(<SignupScreen />);

    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields including invitation code');
    });
  });

  it('should show error when email is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields including invitation code');
    });
  });

  it('should show error when password is empty', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields including invitation code');
    });
  });

  it('should show error when invitation code is invalid', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(false);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'INVALID');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid or already used invitation code. Please check your code and try again.');
    });
  });

  it('should show error when passwords do not match', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password456');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    });
  });

  it('should show error when password is too short', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '12345');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), '12345');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    });
  });

  it('should show error for invalid email format', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('should accept valid email formats', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(true);
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user_name@example-domain.com',
    ];

    for (const email of validEmails) {
      const { getByText, getByPlaceholderText } = render(<SignupScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
      fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(invitationCodeService.useInvitationCode).toHaveBeenCalledWith('ABC12345', email);
        expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
      });

      jest.clearAllMocks();
    }
  });

  it('should successfully create account with valid data and invitation code', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(invitationCodeService.isValidInvitationCode).toHaveBeenCalledWith('ABC12345');
      expect(invitationCodeService.useInvitationCode).toHaveBeenCalledWith('ABC12345', 'test@example.com');
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile/create');
    });

    // User is now stored in users array
    const usersData = await AsyncStorage.getItem('users');
    expect(usersData).toBeTruthy();
    const users = JSON.parse(usersData || '[]');
    expect(users.length).toBeGreaterThan(0);
    
    const user = users.find((u: any) => u.email === 'test@example.com');
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    // Password is now hashed, not stored in plain text
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('password123');

    const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
    expect(isAuthenticated).toBe('true');
  });

  it('should handle invitation code use failure', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(false);
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to use invitation code. It may have been used already.');
    });
  });

  it('should format invitation code to uppercase', () => {
    const { getByPlaceholderText } = render(<SignupScreen />);

    const codeInput = getByPlaceholderText('Enter invitation code');
    fireEvent.changeText(codeInput, 'abc12345');

    expect(codeInput.props.value).toBe('ABC12345');
  });

  it('should show loading state during signup', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    (invitationCodeService.useInvitationCode as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    // Button should show loading text
    await waitFor(() => {
      expect(getByText('Creating Account...')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(true);
    // Spy on ErrorHandler to ensure it is called with generic error message
    const handleErrorSpy = jest.spyOn(ErrorHandler, 'handleError');
    // Mock AsyncStorage to throw error
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('Storage error')));

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to create account. Please try again.',
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    AsyncStorage.setItem = originalSetItem;
    handleErrorSpy.mockRestore();
  });

  it('should fall back to default password error message when validation error is empty', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const validatePasswordSpy = jest.spyOn(validation, 'validatePassword').mockReturnValue({
      isValid: false,
      error: '',
    } as any);

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '12345');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), '12345');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    });

    validatePasswordSpy.mockRestore();
  });

  it('should fall back to default email error message when validation error is empty', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    const validateEmailSpy = jest.spyOn(validation, 'validateEmail').mockReturnValue({
      isValid: false,
      error: '',
    } as any);

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });

    validateEmailSpy.mockRestore();
  });

  it('should surface specific error message when account already exists', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(true);

    // Spy on ErrorHandler and force AsyncStorage error with "already exists" message
    const handleErrorSpy = jest.spyOn(ErrorHandler, 'handleError').mockImplementation(() => {});
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('User already exists')));

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'User already exists',
        expect.objectContaining({ email: 'existing@example.com' }),
      );
    });

    AsyncStorage.setItem = originalSetItem;
    handleErrorSpy.mockRestore();
  });

  it('should fall back to generic error message when non-Error is thrown', async () => {
    (invitationCodeService.isValidInvitationCode as jest.Mock).mockResolvedValue(true);
    (invitationCodeService.useInvitationCode as jest.Mock).mockResolvedValue(true);

    const handleErrorSpy = jest.spyOn(ErrorHandler, 'handleError').mockImplementation(() => {});
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject('some error' as any));

    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter invitation code'), 'ABC12345');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'error@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(handleErrorSpy).toHaveBeenCalledWith(
        'some error',
        'Failed to create account. Please try again.',
        expect.objectContaining({ email: 'error@example.com' }),
      );
    });

    AsyncStorage.setItem = originalSetItem;
    handleErrorSpy.mockRestore();
  });

  it('should navigate to login screen', () => {
    const { getByText } = render(<SignupScreen />);

    fireEvent.press(getByText("Already have an account? Log In"));

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('should update input values correctly', () => {
    const { getByPlaceholderText } = render(<SignupScreen />);

    const codeInput = getByPlaceholderText('Enter invitation code');
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const confirmPasswordInput = getByPlaceholderText('Confirm your password');

    fireEvent.changeText(codeInput, 'ABC12345');
    fireEvent.changeText(emailInput, 'newemail@example.com');
    fireEvent.changeText(passwordInput, 'newpassword123');
    fireEvent.changeText(confirmPasswordInput, 'newpassword123');

    expect(codeInput.props.value).toBe('ABC12345');
    expect(emailInput.props.value).toBe('newemail@example.com');
    expect(passwordInput.props.value).toBe('newpassword123');
    expect(confirmPasswordInput.props.value).toBe('newpassword123');
  });
});
