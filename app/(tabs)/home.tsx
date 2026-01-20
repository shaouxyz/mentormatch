import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { initializeTestAccounts, TEST_ACCOUNTS } from '../../utils/testAccounts';

interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProfiles();
    }
  }, []);

  const loadProfiles = async () => {
    try {
      // Initialize test accounts once
      await initializeTestAccounts();
      
      const profileData = await AsyncStorage.getItem('profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setCurrentProfile(profile);
      }

      // Get current user email to exclude from list
      const userData = await AsyncStorage.getItem('user');
      const currentUserEmail = userData ? JSON.parse(userData).email : null;

      // In a real app, you would fetch from an API
      // For now, we'll create some mock matches based on the current user's profile
      const allProfiles = await AsyncStorage.getItem('allProfiles');
      let profilesList: Profile[] = [];
      
      if (allProfiles) {
        profilesList = JSON.parse(allProfiles);
      } else {
        // Create some sample profiles for demonstration
        profilesList = [
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
          {
            name: 'Emily Davis',
            expertise: 'Marketing',
            interest: 'Design',
            expertiseYears: 4,
            interestYears: 0,
            email: 'emily@example.com',
            phoneNumber: '+1234567892',
          },
        ];
        await AsyncStorage.setItem('allProfiles', JSON.stringify(profilesList));
      }

      // Add test account profiles (excluding current user)
      const testProfiles: Profile[] = TEST_ACCOUNTS
        .filter((account) => account.email !== currentUserEmail && account.profile)
        .map((account) => account.profile!);
      
      // Combine and remove duplicates
      const allProfilesCombined = [...profilesList, ...testProfiles];
      const uniqueProfiles = allProfilesCombined.filter(
        (profile, index, self) =>
          index === self.findIndex((p) => p.email === profile.email)
      );

      setProfiles(uniqueProfiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  };

  const getMatchScore = (profile: Profile): number => {
    if (!currentProfile) return 0;
    
    let score = 0;
    
    // Check if their expertise matches our interest
    if (profile.expertise.toLowerCase().includes(currentProfile.interest.toLowerCase()) ||
        currentProfile.interest.toLowerCase().includes(profile.expertise.toLowerCase())) {
      score += 50;
    }
    
    // Check if their interest matches our expertise
    if (profile.interest.toLowerCase().includes(currentProfile.expertise.toLowerCase()) ||
        currentProfile.expertise.toLowerCase().includes(profile.interest.toLowerCase())) {
      score += 50;
    }
    
    return score;
  };

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return profiles;
    }

    const query = searchQuery.toLowerCase().trim();
    return profiles.filter((profile) => {
      // Search across all fields
      return (
        profile.name.toLowerCase().includes(query) ||
        profile.expertise.toLowerCase().includes(query) ||
        profile.interest.toLowerCase().includes(query) ||
        profile.email.toLowerCase().includes(query) ||
        profile.phoneNumber.includes(query) ||
        profile.expertiseYears.toString().includes(query) ||
        profile.interestYears.toString().includes(query)
      );
    });
  }, [profiles, searchQuery]);

  const renderProfile = ({ item }: { item: Profile }) => {
    const matchScore = getMatchScore(item);
    const isGoodMatch = matchScore >= 50;

    return (
      <TouchableOpacity
        style={[styles.profileCard, isGoodMatch && styles.goodMatchCard]}
        onPress={() => router.push({
          pathname: '/profile/view',
          params: { profile: JSON.stringify(item) },
        })}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{item.name}</Text>
            {isGoodMatch && (
              <View style={styles.matchBadge}>
                <Ionicons name="heart" size={14} color="#ef4444" />
                <Text style={styles.matchText}>Good Match</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Expertise: </Text>
              {item.expertise} ({item.expertiseYears} years)
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="book" size={16} color="#3b82f6" />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Learning: </Text>
              {item.interest} ({item.interestYears} years)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>Complete your profile first</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/profile/create')}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Your Mentor</Text>
        <Text style={styles.headerSubtitle}>
          Discover people who match your interests
        </Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, expertise, interest, email, phone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        
        {searchQuery.length > 0 && (
          <Text style={styles.searchResultsText}>
            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'result' : 'results'} found
          </Text>
        )}
      </View>

      <FlatList
        data={filteredProfiles}
        renderItem={renderProfile}
        keyExtractor={(item, index) => `${item.email}-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name={searchQuery ? "search-outline" : "people-outline"} 
              size={64} 
              color="#cbd5e1" 
            />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No profiles match your search' : 'No profiles found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Check back later for new matches'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  list: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goodMatchCard: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 4,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#475569',
    flex: 1,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearSearchButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  clearSearchButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});
