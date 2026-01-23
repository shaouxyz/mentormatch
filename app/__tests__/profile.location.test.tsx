/**
 * Tests for location field in profile creation and editing
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateProfileScreen from '../profile/create';
import EditProfileScreen from '../profile/edit';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

describe('Profile Location Field', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Create Profile with Location', () => {
    it('should allow creating profile with location', async () => {
      // Set up user
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      // Wait for component to load
      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in all fields including location
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Machine Learning');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('e.g., San Francisco, CA or New York City'), 'San Francisco, CA');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      // Submit
      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Profile created successfully!',
          expect.any(Array)
        );
      });

      // Verify profile was saved with location
      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBe('San Francisco, CA');
      expect(profile.name).toBe('John Doe');
      expect(profile.expertise).toBe('Software Development');
    });

    it('should allow creating profile without location (optional)', async () => {
      // Set up user
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in all required fields but NOT location
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Jane Smith');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Marketing');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '3');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Sales');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '1');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-5678');

      // Submit
      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Profile created successfully!',
          expect.any(Array)
        );
      });

      // Verify profile was saved without location
      const savedProfile = await AsyncStorage.getItem('profile');
      expect(savedProfile).toBeTruthy();
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBeUndefined();
      expect(profile.name).toBe('Jane Smith');
    });

    it('should handle spaces in location field', async () => {
      // Set up user
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in fields with multi-word location
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Engineering');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Design');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('e.g., San Francisco, CA or New York City'), 'New York City');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-9999');

      // Submit
      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify location with spaces was saved correctly
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBe('New York City');
    });

    it('should sanitize location input', async () => {
      // Set up user
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in fields with location containing dangerous characters
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Engineering');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Design');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('e.g., San Francisco, CA or New York City'), '<script>alert("xss")</script>Boston');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-9999');

      // Submit
      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify dangerous characters were removed
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBe('Boston');
      expect(profile.location).not.toContain('<script>');
    });
  });

  describe('Edit Profile with Location', () => {
    it('should load existing location when editing', async () => {
      // Set up user and profile with location
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'John Doe',
        expertise: 'Engineering',
        interest: 'Design',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1234',
        location: 'Seattle, WA',
      }));

      const { getByDisplayValue } = render(<EditProfileScreen />);

      // Wait for profile to load
      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
        expect(getByDisplayValue('Seattle, WA')).toBeTruthy();
      });
    });

    it('should update location when editing', async () => {
      // Set up user and profile
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'John Doe',
        expertise: 'Engineering',
        interest: 'Design',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1234',
        location: 'Seattle, WA',
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Seattle, WA')).toBeTruthy();
      });

      // Change location
      fireEvent.changeText(getByDisplayValue('Seattle, WA'), 'Portland, OR');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Profile updated successfully!',
          expect.any(Array)
        );
      });

      // Verify location was updated
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBe('Portland, OR');
    });

    it('should allow removing location', async () => {
      // Set up user and profile with location
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'John Doe',
        expertise: 'Engineering',
        interest: 'Design',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1234',
        location: 'Seattle, WA',
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Seattle, WA')).toBeTruthy();
      });

      // Clear location
      fireEvent.changeText(getByDisplayValue('Seattle, WA'), '');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify location was removed
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBeUndefined();
    });
  });
});
