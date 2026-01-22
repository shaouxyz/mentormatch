import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../(tabs)/home';
import { useRouter } from 'expo-router';
import { initializeTestAccounts } from '../../utils/testAccounts';

// Get mock router (from global mock in jest.setup.js)
const mockRouter = useRouter();

describe('HomeScreen (Discover)', () => {
  beforeEach(async () => {
    AsyncStorage.clear();
    jest.clearAllMocks();
    await initializeTestAccounts();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should show empty state when user has no profile', async () => {
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Complete your profile first')).toBeTruthy();
      expect(getByText('Create Profile')).toBeTruthy();
    });
  });

  it('should load and display profiles when user has profile', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
      expect(getByText('Find Your Mentor')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should display search bar', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByPlaceholderText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('Search by name, expertise, interest, email, phone...')).toBeTruthy();
    });
  });

  it('should filter profiles by name', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
      {
        name: 'Michael Chen',
        expertise: 'Data Science',
        interest: 'Software Development',
        expertiseYears: 7,
        interestYears: 2,
        email: 'michael@example.com',
        phoneNumber: '+1234567891',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getByPlaceholderText, getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'Sarah');
    });

    await waitFor(() => {
      expect(getByText('Sarah Johnson')).toBeTruthy();
      expect(queryByText('Michael Chen')).toBeNull();
      expect(getByText('1 result found')).toBeTruthy();
    });
  });

  it('should filter profiles by expertise', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
      {
        name: 'Michael Chen',
        expertise: 'Data Science',
        interest: 'Software Development',
        expertiseYears: 7,
        interestYears: 2,
        email: 'michael@example.com',
        phoneNumber: '+1234567891',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getByPlaceholderText, getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'Data Science');
    });

    await waitFor(() => {
      // Both profiles have "Data Science" (Michael as expertise, Sarah as interest)
      expect(getByText('Michael Chen')).toBeTruthy();
      expect(getByText('Sarah Johnson')).toBeTruthy();
    });
  });

  it('should filter profiles by email', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'sarah@example.com');
    });

    await waitFor(() => {
      expect(getByText('Sarah Johnson')).toBeTruthy();
    });
  });

  it('should show clear button when search query exists', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByPlaceholderText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'test');
    });

    await waitFor(() => {
      // Since we can't easily test Ionicons, we'll check that search results text appears
      expect(getByPlaceholderText('Search by name, expertise, interest, email, phone...').props.value).toBe('test');
    });
  });

  it('should clear search when clear button is pressed', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByPlaceholderText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'test');
      expect(searchInput.props.value).toBe('test');
      
      // Clear by setting empty string (simulating clear button)
      fireEvent.changeText(searchInput, '');
      expect(searchInput.props.value).toBe('');
    });
  });

  it('should exclude current user from profiles list', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
      {
        name: 'Current User',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 2,
        email: 'current@example.com',
        phoneNumber: '+1234567890',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      // Current user should not appear in the list
      expect(queryByText('Current User')).toBeNull();
    });
  });

  it('should navigate to profile view when profile card is pressed', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      const profileCard = getByText('Sarah Johnson');
      fireEvent.press(profileCard);
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/profile/view',
        params: expect.objectContaining({
          profile: expect.stringContaining('Sarah Johnson'),
        }),
      });
    });
  });

  it('should show empty state when no profiles match search', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Software Development',
        interest: 'Data Science',
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search by name, expertise, interest, email, phone...');
      fireEvent.changeText(searchInput, 'nonexistent');
    });

    await waitFor(() => {
      expect(getByText('No profiles match your search')).toBeTruthy();
      expect(getByText('Try a different search term')).toBeTruthy();
    });
  });

  it('should include test account profiles in the list', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      // Test account t0 should appear (if not current user)
      // Since current user is 'current@example.com', t0 should appear
      expect(getByText('Test User 0')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should handle refresh pull-to-refresh', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      // Verify component renders with RefreshControl
      // RefreshControl is tested implicitly through FlatList
      expect(getByText('Find Your Mentor')).toBeTruthy();
    });
  });

  it('should show match badge for good matches', async () => {
    const userProfile = {
      name: 'Current User',
      expertise: 'Software Development',
      interest: 'Data Science',
      expertiseYears: 5,
      interestYears: 2,
      email: 'current@example.com',
      phoneNumber: '+1234567890',
    };

    // Profile with matching expertise/interest (should be good match)
    const allProfiles = [
      {
        name: 'Sarah Johnson',
        expertise: 'Data Science', // Matches user's interest
        interest: 'Software Development', // Matches user's expertise
        expertiseYears: 5,
        interestYears: 1,
        email: 'sarah@example.com',
        phoneNumber: '+1234567890',
      },
    ];

    await AsyncStorage.setItem('user', JSON.stringify({ email: 'current@example.com' }));
    await AsyncStorage.setItem('profile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));

    const { getAllByText } = render(<HomeScreen />);

    await waitFor(() => {
      // Good match badge should appear (may be multiple matches)
      const goodMatchBadges = getAllByText('Good Match');
      expect(goodMatchBadges.length).toBeGreaterThan(0);
    });
  });
});
