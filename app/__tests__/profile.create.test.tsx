import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateProfileScreen from '../profile/create';
import * as expoRouter from 'expo-router';

// Get mock router from expo-router mock
const mockRouter = expoRouter.useRouter();

jest.spyOn(Alert, 'alert');

describe('CreateProfileScreen', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    // Set up user for profile creation
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
  });

  it('should render all form fields', () => {
    const { getByText, getByPlaceholderText } = render(<CreateProfileScreen />);

    expect(getByText('Create Your Profile')).toBeTruthy();
    expect(getByText('Tell us about yourself')).toBeTruthy();
    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByPlaceholderText('e.g., Software Development, Marketing, Design')).toBeTruthy();
    expect(getByPlaceholderText('Enter years of expertise experience')).toBeTruthy();
    expect(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography')).toBeTruthy();
    expect(getByPlaceholderText('Enter years of interest experience')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your phone number')).toBeTruthy();
    expect(getByText('Save Profile')).toBeTruthy();
  });

  it('should show error when name is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    // Fill all fields except name
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your name');
    });
  });

  it('should show error when expertise is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    // Skip expertise
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your expertise area');
    });
  });

  it('should show error when interest is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    // Skip interest
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your interest area');
    });
  });

  it('should show error when expertise years is invalid', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), 'abc'); // Invalid
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid number of years for expertise');
    });
  });

  it('should show error when expertise years is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), ''); // Empty
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid number of years for expertise');
    });
  });

  it('should show error when interest years is invalid', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), 'xyz'); // Invalid
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid number of years for interest');
    });
  });

  it('should show error when email is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    // Skip email
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email');
    });
  });

  it('should show error when phone number is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    // Skip phone
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your phone number');
    });
  });

  it('should show error when phone number is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), ''); // Empty
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your phone number');
    });
  });

  it('should successfully create profile with valid data', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5'); // Expertise years
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2'); // Interest years
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile created successfully!', expect.any(Array));
    });
    
    // Simulate OK button press
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call) => call[0] === 'Success'
    );
    if (alertCall && alertCall[2] && alertCall[2][0]) {
      alertCall[2][0].onPress();
    }

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
    });

    const profile = await AsyncStorage.getItem('profile');
    expect(profile).toBeTruthy();
    const parsed = JSON.parse(profile || '{}');
    expect(parsed.name).toBe('John Doe');
    expect(parsed.expertise).toBe('Software Development');
    expect(parsed.interest).toBe('Data Science');
    expect(parsed.expertiseYears).toBe(5);
    expect(parsed.interestYears).toBe(2);
    expect(parsed.email).toBe('john@example.com');
    expect(parsed.phoneNumber).toBe('+1234567890');
    expect(parsed.createdAt).toBeTruthy();
    expect(parsed.updatedAt).toBeTruthy();
  });

  it('should accept zero years of experience', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'New User');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'New Field');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '0');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Learning');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '0');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile created successfully!', expect.any(Array));
    });

    const profile = await AsyncStorage.getItem('profile');
    const parsed = JSON.parse(profile || '{}');
    expect(parsed.expertiseYears).toBe(0);
    expect(parsed.interestYears).toBe(0);
  });

  it('should handle special characters in name', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), "John O'Brien-Smith");
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile created successfully!', expect.any(Array));
    });

    const profile = await AsyncStorage.getItem('profile');
    const parsed = JSON.parse(profile || '{}');
    // Apostrophe is sanitized for security (prevents injection attacks)
    expect(parsed.name).toBe("John OBrien-Smith");
  });

  it('should handle long text inputs', async () => {
    const longText = 'Very Long Expertise Name That Exceeds Normal Length And Should Still Work';
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), longText);
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile created successfully!', expect.any(Array));
    });

    const profile = await AsyncStorage.getItem('profile');
    const parsed = JSON.parse(profile || '{}');
    expect(parsed.expertise).toBe(longText);
  });

  it('should handle errors gracefully', async () => {
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('Storage error')));

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<CreateProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
    fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
    fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Data Science');
    fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '+1234567890');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      // Alert.alert is called with title, message, and options (buttons)
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Error|Storage Error/),
        'Failed to save profile. Please try again.',
        expect.any(Array)
      );
    });

    AsyncStorage.setItem = originalSetItem;
  });

  it('should auto-fill email from user data', async () => {
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'autofill@example.com' }));
    
    const { getByPlaceholderText } = render(<CreateProfileScreen />);

    await waitFor(() => {
      const emailInput = getByPlaceholderText('Enter your email');
      expect(emailInput.props.value).toBe('autofill@example.com');
    });
  });
});
