import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

interface ProfileData {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: string;
  interestYears: string;
  email: string;
  phoneNumber: string;
}

export default function CreateProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    expertise: '',
    interest: '',
    expertiseYears: '',
    interestYears: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setProfile(prev => ({ ...prev, email: user.email }));
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!profile.expertise.trim()) {
      Alert.alert('Error', 'Please enter your expertise area');
      return;
    }
    if (!profile.interest.trim()) {
      Alert.alert('Error', 'Please enter your interest area');
      return;
    }
    if (!profile.expertiseYears || isNaN(Number(profile.expertiseYears)) || Number(profile.expertiseYears) < 0) {
      Alert.alert('Error', 'Please enter a valid number of years for expertise');
      return;
    }
    if (!profile.interestYears || isNaN(Number(profile.interestYears)) || Number(profile.interestYears) < 0) {
      Alert.alert('Error', 'Please enter a valid number of years for interest');
      return;
    }
    if (!profile.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!profile.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(profile.phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        ...profile,
        expertiseYears: Number(profile.expertiseYears),
        interestYears: Number(profile.interestYears),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('profile', JSON.stringify(profileData));
      Alert.alert('Success', 'Profile created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      console.error('Profile save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Expertise (Where you can mentor) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Software Development, Marketing, Design"
              value={profile.expertise}
              onChangeText={(text) => setProfile({ ...profile, expertise: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Years of Experience in Expertise *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of years"
              value={profile.expertiseYears}
              onChangeText={(text) => setProfile({ ...profile, expertiseYears: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Interest (Where you want to learn) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Data Science, Business Strategy, Photography"
              value={profile.interest}
              onChangeText={(text) => setProfile({ ...profile, interest: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Years of Experience in Interest *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of years"
              value={profile.interestYears}
              onChangeText={(text) => setProfile({ ...profile, interestYears: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={profile.phoneNumber}
              onChangeText={(text) => setProfile({ ...profile, phoneNumber: text })}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
