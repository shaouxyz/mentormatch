import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { safeParseJSON, validateProfileSchema } from '@/utils/schemaValidation';
import { endSession } from '@/utils/sessionManager';
import { suspendAccount, deleteAccount, clearAllUserData } from '@/services/accountService';
import { hybridGetProfile } from '@/services/hybridProfileService';
import { isFirebaseConfigured } from '@/config/firebase.config';

interface Profile {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
  caspaRole?: string;
  ltmNumber?: string;
}

/**
 * Profile Tab Component
 * 
 * Displays the current user's profile with:
 * - Profile information display
 * - Edit profile navigation
 * - Logout functionality
 * - Session management integration
 * 
 * @component
 * @returns {JSX.Element} Profile screen with user information and actions
 */
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const profileData = await AsyncStorage.getItem('profile');
      if (!isMountedRef.current) return;

      if (profileData) {
        const parsedProfile = safeParseJSON(
          profileData,
          validateProfileSchema,
          null
        );
        if (parsedProfile) {
          if (isFirebaseConfigured()) {
            try {
              const remote = await hybridGetProfile(parsedProfile.email);
              if (remote?.suspended) {
                await clearAllUserData();
                if (isMountedRef.current) {
                  setProfile(null);
                  setLoading(false);
                }
                router.replace('/');
                Alert.alert('Account suspended', 'Your account has been suspended. Contact support if you need access.');
                return;
              }
            } catch (_) {
              // Ignore fetch errors; use local profile
            }
          }
          if (isMountedRef.current) setProfile(parsedProfile);
        } else {
          if (isMountedRef.current) setProfile(null);
        }
      } else {
        if (isMountedRef.current) setProfile(null);
      }
    } catch (error) {
      logger.error('Error loading profile', error instanceof Error ? error : new Error(String(error)));
      if (isMountedRef.current) setProfile(null);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleNavigateToRequests = useCallback(() => {
    router.push('/(tabs)/requests');
  }, []); // router is stable, no need to include in deps

  const handleNavigateToEdit = useCallback(() => {
    router.push('/profile/edit');
  }, []); // router is stable, no need to include in deps

  const handleNavigateToCreate = useCallback(() => {
    router.push('/profile/create');
  }, []); // router is stable, no need to include in deps

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await endSession();
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('profile');
              router.replace('/');
            } catch (error) {
              ErrorHandler.handleStorageError(error, 'log out');
            }
          },
        },
      ]
    );
  };

  const handleSuspendAccount = () => {
    if (!profile?.email) return;
    Alert.alert(
      'Suspend Account',
      'Your account will be suspended. You will be signed out and cannot sign in again until the account is restored. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await suspendAccount(profile.email);
              router.replace('/');
            } catch (error) {
              ErrorHandler.handleError(error, 'Failed to suspend account');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!profile?.email) return;
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and data. You will be signed out. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(profile.email);
              router.replace('/');
            } catch (error) {
              ErrorHandler.handleError(error, 'Failed to delete account');
            }
          },
        },
      ]
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

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>No profile found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNavigateToCreate}
            accessibilityLabel="Create profile button"
            accessibilityHint="Tap to create your profile"
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phoneNumber}</Text>
              </View>
            </View>
          </View>

          {profile.caspaRole && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="ribbon-outline" size={20} color="#8b5cf6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>CASPA Role</Text>
                  <Text style={styles.infoValue}>{profile.caspaRole}</Text>
                </View>
              </View>
            </View>
          )}

          {profile.ltmNumber && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="id-card-outline" size={20} color="#8b5cf6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>LTM Number</Text>
                  <Text style={styles.infoValue}>{profile.ltmNumber}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentoring</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Expertise</Text>
                <Text style={styles.infoValue}>{profile.expertise}</Text>
                <Text style={styles.infoSubtext}>
                  {profile.expertiseYears} years of experience
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="book" size={20} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Interest</Text>
                <Text style={styles.infoValue}>{profile.interest}</Text>
                <Text style={styles.infoSubtext}>
                  {profile.interestYears} years of experience
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.requestsButton}
          onPress={handleNavigateToRequests}
          accessibilityLabel="View requests button"
          accessibilityHint="Tap to view your mentorship requests"
        >
          <Ionicons name="mail" size={20} color="#2563eb" />
          <Text style={styles.requestsButtonText}>View Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleNavigateToEdit}
          accessibilityLabel="Edit profile button"
          accessibilityHint="Tap to edit your profile information"
        >
          <Ionicons name="pencil" size={20} color="#2563eb" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Log out button"
          accessibilityHint="Tap to log out of your account"
        >
          <Ionicons name="log-out-outline" size={20} color="#475569" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accountButton}
            onPress={() => setAccountExpanded((prev) => !prev)}
            accessibilityLabel="Account"
            accessibilityHint={accountExpanded ? 'Collapse account options' : 'Expand to show Suspend and Delete account'}
            accessibilityState={{ expanded: accountExpanded }}
          >
            <Ionicons name="person-circle-outline" size={20} color="#475569" />
            <Text style={styles.accountButtonText}>Account</Text>
            <Ionicons name={accountExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
          </TouchableOpacity>
          {accountExpanded && (
            <>
              <TouchableOpacity
                style={styles.suspendButton}
                onPress={handleSuspendAccount}
                accessibilityLabel="Suspend Account"
                accessibilityHint="Suspend your account; you will be signed out until restored"
              >
                <Ionicons name="pause-circle-outline" size={20} color="#b45309" />
                <Text style={styles.suspendButtonText}>Suspend Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                accessibilityLabel="Delete Account"
                accessibilityHint="Permanently delete your account and data"
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  requestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  requestsButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  suspendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  suspendButtonText: {
    color: '#b45309',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  accountButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 24,
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
