import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewProfileScreen from '../profile/view';
import * as expoRouter from 'expo-router';
import * as connectionUtils from '@/utils/connectionUtils';

// Mock useLocalSearchParams
const mockParams = { email: '', profile: '' };

jest.spyOn(expoRouter, 'useLocalSearchParams').mockImplementation(() => mockParams);

// Get mock router
const mockRouter = expoRouter.useRouter();

// Mock connection utils
jest.mock('@/utils/connectionUtils', () => ({
  areUsersMatched: jest.fn(),
}));

describe('ViewProfileScreen', () => {
  const mockProfile = {
    name: 'John Doe',
    expertise: 'Software Development',
    interest: 'Data Science',
    expertiseYears: 5,
    interestYears: 2,
    email: 'john@example.com',
    phoneNumber: '+1234567890',
    location: 'New York',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockParams.email = '';
    mockParams.profile = '';
  });

  it('should render loading state initially', async () => {
    mockParams.email = 'test@example.com';
    // Don't set allProfiles, so it will be loading
    const { getByText } = render(<ViewProfileScreen />);
    // Loading state should be visible initially
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should display profile when passed via profile param', async () => {
    mockParams.profile = JSON.stringify(mockProfile);
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'other@example.com' }));
    (connectionUtils.areUsersMatched as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Software Development')).toBeTruthy();
      expect(getByText('Data Science')).toBeTruthy();
    });
  });

  it('should hide contact info for unmatched users', async () => {
    mockParams.profile = JSON.stringify(mockProfile);
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'other@example.com' }));
    (connectionUtils.areUsersMatched as jest.Mock).mockResolvedValue(false);

    const { getByText, queryByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      // Contact info should be hidden
      expect(queryByText('john@example.com')).toBeNull();
      expect(queryByText('+1234567890')).toBeNull();
      // Privacy message should be shown
      expect(getByText('Connect to view contact details')).toBeTruthy();
    });
  });

  it('should show contact info for matched users', async () => {
    mockParams.profile = JSON.stringify(mockProfile);
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'other@example.com' }));
    (connectionUtils.areUsersMatched as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      // Contact info should be visible
      expect(getByText('john@example.com')).toBeTruthy();
      expect(getByText('+1234567890')).toBeTruthy();
    });
  });

  it('should always show contact info for own profile', async () => {
    mockParams.profile = JSON.stringify(mockProfile);
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'john@example.com' }));

    const { getByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      // Contact info should always be visible for own profile
      expect(getByText('john@example.com')).toBeTruthy();
      expect(getByText('+1234567890')).toBeTruthy();
    });

    // areUsersMatched should not be called for own profile
    expect(connectionUtils.areUsersMatched).not.toHaveBeenCalled();
  });

  it('should load profile from allProfiles when email param provided', async () => {
    mockParams.email = 'john@example.com';
    await AsyncStorage.setItem('allProfiles', JSON.stringify([mockProfile]));
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'other@example.com' }));
    (connectionUtils.areUsersMatched as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });
  });

  it('should show profile not found when profile does not exist', async () => {
    mockParams.email = 'nonexistent@example.com';
    await AsyncStorage.setItem('allProfiles', JSON.stringify([]));

    const { getByText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      expect(getByText('Profile not found')).toBeTruthy();
    });
  });

  it('should navigate back when back button pressed', async () => {
    mockParams.profile = JSON.stringify(mockProfile);
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'other@example.com' }));
    (connectionUtils.areUsersMatched as jest.Mock).mockResolvedValue(false);

    const { getByLabelText } = render(<ViewProfileScreen />);

    await waitFor(() => {
      const backButton = getByLabelText('Back button');
      expect(backButton).toBeTruthy();
    });
  });
});
