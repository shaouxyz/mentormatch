/**
 * Tests for space input in expertise and interest fields
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateProfileScreen from '../profile/create';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
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

describe('Space Input in Profile Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Expertise Field', () => {
    it('should allow spaces in expertise field', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Type multi-word expertise
      const expertiseInput = getByPlaceholderText('e.g., Software Development, Marketing, Design');
      fireEvent.changeText(expertiseInput, 'Software Development');

      // Verify the value was set correctly
      expect(expertiseInput.props.value).toBe('Software Development');
    });

    it('should handle multiple words with spaces in expertise', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      const expertiseInput = getByPlaceholderText('e.g., Software Development, Marketing, Design');
      
      // Test various multi-word expertise
      fireEvent.changeText(expertiseInput, 'Product Management');
      expect(expertiseInput.props.value).toBe('Product Management');

      fireEvent.changeText(expertiseInput, 'Business Strategy and Planning');
      expect(expertiseInput.props.value).toBe('Business Strategy and Planning');

      fireEvent.changeText(expertiseInput, 'Data Science and Machine Learning');
      expect(expertiseInput.props.value).toBe('Data Science and Machine Learning');
    });

    it('should save expertise with spaces correctly', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in all fields with multi-word expertise
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Software Development');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Design');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.expertise).toBe('Software Development');
    });
  });

  describe('Interest Field', () => {
    it('should allow spaces in interest field', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Type multi-word interest
      const interestInput = getByPlaceholderText('e.g., Data Science, Business Strategy, Photography');
      fireEvent.changeText(interestInput, 'Business Strategy');

      // Verify the value was set correctly
      expect(interestInput.props.value).toBe('Business Strategy');
    });

    it('should handle multiple words with spaces in interest', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      const interestInput = getByPlaceholderText('e.g., Data Science, Business Strategy, Photography');
      
      // Test various multi-word interests
      fireEvent.changeText(interestInput, 'Machine Learning');
      expect(interestInput.props.value).toBe('Machine Learning');

      fireEvent.changeText(interestInput, 'Digital Marketing');
      expect(interestInput.props.value).toBe('Digital Marketing');

      fireEvent.changeText(interestInput, 'User Experience Design');
      expect(interestInput.props.value).toBe('User Experience Design');
    });

    it('should save interest with spaces correctly', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in all fields with multi-word interest
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Engineering');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Machine Learning');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.interest).toBe('Machine Learning');
    });
  });

  describe('Combined Expertise and Interest with Spaces', () => {
    it('should handle both expertise and interest with spaces', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in both fields with multi-word values
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Product Management');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '7');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Business Strategy');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '3');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Profile created successfully!',
          expect.any(Array)
        );
      });

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.expertise).toBe('Product Management');
      expect(profile.interest).toBe('Business Strategy');
    });

    it('should handle commas and special characters with spaces', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Fill in fields with commas and special characters
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), 'Sales, Marketing & Business Development');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'AI/ML & Data Science');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.expertise).toContain('Sales');
      expect(profile.expertise).toContain('Marketing');
      expect(profile.interest).toContain('AI/ML');
      expect(profile.interest).toContain('Data Science');
    });
  });

  describe('Sanitization with Spaces', () => {
    it('should sanitize but preserve spaces', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));

      const { getByPlaceholderText, getByText } = render(<CreateProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      });

      // Try to inject HTML with spaces
      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('e.g., Software Development, Marketing, Design'), '<script>alert("xss")</script>Software Development');
      fireEvent.changeText(getByPlaceholderText('Enter years of expertise experience'), '5');
      fireEvent.changeText(getByPlaceholderText('e.g., Data Science, Business Strategy, Photography'), 'Machine Learning<div>test</div>');
      fireEvent.changeText(getByPlaceholderText('Enter years of interest experience'), '2');
      fireEvent.changeText(getByPlaceholderText('Enter your phone number'), '555-1234');

      fireEvent.press(getByText('Save Profile'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      
      // Should remove HTML but keep the text with spaces
      expect(profile.expertise).toBe('Software Development');
      expect(profile.expertise).not.toContain('<script>');
      expect(profile.interest).toBe('Machine Learningtest');
      expect(profile.interest).not.toContain('<div>');
    });
  });
});
