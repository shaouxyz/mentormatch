/**
 * Tests for profile editing functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditProfileScreen from '../profile/edit';

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockBack,
  }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

describe('Edit Profile Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Load Existing Profile', () => {
    it('should load and display existing profile data', async () => {
      // Set up user and profile
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'John Doe',
        expertise: 'Software Development',
        interest: 'Machine Learning',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1234',
        location: 'San Francisco, CA',
      }));

      const { getByDisplayValue } = render(<EditProfileScreen />);

      // Wait for profile to load
      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
        expect(getByDisplayValue('Software Development')).toBeTruthy();
        expect(getByDisplayValue('Machine Learning')).toBeTruthy();
        expect(getByDisplayValue('5')).toBeTruthy();
        expect(getByDisplayValue('2')).toBeTruthy();
        expect(getByDisplayValue('555-1234')).toBeTruthy();
        expect(getByDisplayValue('San Francisco, CA')).toBeTruthy();
      });
    });

    it('should handle profile without location', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Jane Smith',
        expertise: 'Marketing',
        interest: 'Sales',
        expertiseYears: 3,
        interestYears: 1,
        email: 'test@example.com',
        phoneNumber: '555-5678',
      }));

      const { getByDisplayValue, queryByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jane Smith')).toBeTruthy();
        expect(getByDisplayValue('Marketing')).toBeTruthy();
      });

      // Location should be empty
      const locationInputs = queryByDisplayValue('San Francisco');
      expect(locationInputs).toBeNull();
    });
  });

  describe('Update Profile', () => {
    it('should update profile successfully', async () => {
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
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Update name
      fireEvent.changeText(getByDisplayValue('John Doe'), 'Jane Doe');
      
      // Update expertise years
      fireEvent.changeText(getByDisplayValue('5'), '6');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Profile updated successfully!',
          expect.any(Array)
        );
      });

      // Verify profile was updated
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('Jane Doe');
      expect(profile.expertiseYears).toBe(6);
    });

    it('should update location field', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Test User',
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

      // Update location
      fireEvent.changeText(getByDisplayValue('Seattle, WA'), 'Portland, OR');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify location was updated
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.location).toBe('Portland, OR');
    });

    it('should update all fields', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      await AsyncStorage.setItem('profile', JSON.stringify({
        name: 'Old Name',
        expertise: 'Old Expertise',
        interest: 'Old Interest',
        expertiseYears: 1,
        interestYears: 1,
        email: 'test@example.com',
        phoneNumber: '111-1111',
        location: 'Old City',
      }));

      const { getByDisplayValue, getAllByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Old Name')).toBeTruthy();
      });

      // Update all fields
      fireEvent.changeText(getByDisplayValue('Old Name'), 'New Name');
      fireEvent.changeText(getByDisplayValue('Old Expertise'), 'New Expertise');
      fireEvent.changeText(getByDisplayValue('Old Interest'), 'New Interest');
      
      // Update years fields (there are two with value "1")
      const yearsInputs = getAllByDisplayValue('1');
      fireEvent.changeText(yearsInputs[0], '10'); // expertise years
      fireEvent.changeText(yearsInputs[1], '8'); // interest years
      
      fireEvent.changeText(getByDisplayValue('111-1111'), '999-9999');
      fireEvent.changeText(getByDisplayValue('Old City'), 'New City');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify all fields were updated
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('New Name');
      expect(profile.expertise).toBe('New Expertise');
      expect(profile.interest).toBe('New Interest');
      expect(profile.expertiseYears).toBe(10);
      expect(profile.interestYears).toBe(8);
      expect(profile.phoneNumber).toBe('999-9999');
      expect(profile.location).toBe('New City');
    });
  });

  describe('Validation', () => {
    it('should validate empty name field', async () => {
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
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Clear name
      fireEvent.changeText(getByDisplayValue('John Doe'), '');

      // Try to save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
      });

      // Verify profile was not updated
      const savedProfile = await AsyncStorage.getItem('profile');
      const profile = JSON.parse(savedProfile!);
      expect(profile.name).toBe('John Doe');
    });

    it('should validate all required fields', async () => {
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
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Clear expertise
      fireEvent.changeText(getByDisplayValue('Engineering'), '');

      // Try to save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back after successful save', async () => {
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
      }));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Make a change
      fireEvent.changeText(getByDisplayValue('John Doe'), 'Jane Doe');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Trigger the callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const callback = alertCall[2][0].onPress;
      callback();

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Profile in allProfiles', () => {
    it('should update profile in allProfiles array', async () => {
      await AsyncStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        passwordHash: 'hash123',
        id: '123',
      }));
      
      const originalProfile = {
        name: 'John Doe',
        expertise: 'Engineering',
        interest: 'Design',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1234',
      };

      await AsyncStorage.setItem('profile', JSON.stringify(originalProfile));
      await AsyncStorage.setItem('allProfiles', JSON.stringify([originalProfile]));

      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('John Doe')).toBeTruthy();
      });

      // Update name
      fireEvent.changeText(getByDisplayValue('John Doe'), 'Jane Doe');

      // Save
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Verify allProfiles was updated
      const allProfilesData = await AsyncStorage.getItem('allProfiles');
      const allProfiles = JSON.parse(allProfilesData!);
      expect(allProfiles).toHaveLength(1);
      expect(allProfiles[0].name).toBe('Jane Doe');
    });
  });
});
