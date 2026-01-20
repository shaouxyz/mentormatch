import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

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

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const profileData = await AsyncStorage.getItem('profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setCurrentProfile(profile);
      }

      // In a real app, you would fetch from an API
      // For now, we'll create some mock matches based on the current user's profile
      const allProfiles = await AsyncStorage.getItem('allProfiles');
      if (allProfiles) {
        const parsed = JSON.parse(allProfiles);
        setProfiles(parsed);
      } else {
        // Create some sample profiles for demonstration
        const sampleProfiles: Profile[] = [
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
        await AsyncStorage.setItem('allProfiles', JSON.stringify(sampleProfiles));
        setProfiles(sampleProfiles);
      }
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
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item, index) => `${item.email}-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No profiles found</Text>
            <Text style={styles.emptyStateSubtext}>
              Check back later for new matches
            </Text>
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
});
