// Reusable Profile Form Fields Component
// Reduces code duplication between create and edit profile screens

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { MAX_NAME_LENGTH, MAX_EXPERTISE_LENGTH, MAX_INTEREST_LENGTH, MAX_YEARS } from '../utils/constants';
import { sanitizeString, sanitizeEmail, sanitizePhoneNumber, sanitizeNumber } from '../utils/security';

interface ProfileFormData {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: string;
  interestYears: string;
  email: string;
  phoneNumber: string;
}

interface ProfileFormFieldsProps {
  profile: ProfileFormData;
  onProfileChange: (profile: ProfileFormData) => void;
}

/**
 * Profile Form Fields Component
 * 
 * Reusable form component for profile creation and editing.
 * Includes all profile input fields with:
 * - Input sanitization
 * - Character limits
 * - Accessibility labels
 * - Memoized for performance
 * 
 * @component
 * @param {ProfileFormFieldsProps} props - Component props
 * @returns {JSX.Element} Profile form fields
 */
export const ProfileFormFields: React.FC<ProfileFormFieldsProps> = React.memo(({ profile, onProfileChange }) => {
  const updateField = (field: keyof ProfileFormData, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  return (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={profile.name}
          onChangeText={(text) => {
            const sanitized = sanitizeString(text);
            if (sanitized.length <= MAX_NAME_LENGTH) {
              updateField('name', sanitized);
            }
          }}
          maxLength={MAX_NAME_LENGTH}
          accessibilityLabel="Name input"
          accessibilityHint="Enter your full name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Expertise (Where you can mentor) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Software Development, Marketing, Design"
          value={profile.expertise}
          onChangeText={(text) => {
            const sanitized = sanitizeString(text);
            if (sanitized.length <= MAX_EXPERTISE_LENGTH) {
              updateField('expertise', sanitized);
            }
          }}
          maxLength={MAX_EXPERTISE_LENGTH}
          accessibilityLabel="Expertise input"
          accessibilityHint="Enter the area where you can mentor others"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Years of Experience in Expertise *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter years of expertise experience"
          value={profile.expertiseYears}
          onChangeText={(text) => {
            const sanitized = sanitizeNumber(text);
            const numValue = Number(sanitized);
            if (sanitized === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= MAX_YEARS)) {
              updateField('expertiseYears', sanitized);
            }
          }}
          keyboardType="numeric"
          accessibilityLabel="Years of experience in expertise input"
          accessibilityHint={`Enter number of years of experience, maximum ${MAX_YEARS} years`}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Interest (Where you want to learn) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Data Science, Business Strategy, Photography"
          value={profile.interest}
          onChangeText={(text) => {
            const sanitized = sanitizeString(text);
            if (sanitized.length <= MAX_INTEREST_LENGTH) {
              updateField('interest', sanitized);
            }
          }}
          maxLength={MAX_INTEREST_LENGTH}
          accessibilityLabel="Interest input"
          accessibilityHint="Enter the area where you want to learn"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Years of Experience in Interest *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter years of interest experience"
          value={profile.interestYears}
          onChangeText={(text) => {
            const sanitized = sanitizeNumber(text);
            const numValue = Number(sanitized);
            if (sanitized === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= MAX_YEARS)) {
              updateField('interestYears', sanitized);
            }
          }}
          keyboardType="numeric"
          accessibilityLabel="Years of experience in interest input"
          accessibilityHint={`Enter number of years of experience, maximum ${MAX_YEARS} years`}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={profile.email}
          onChangeText={(text) => {
            const sanitized = sanitizeEmail(text);
            updateField('email', sanitized);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email input"
          accessibilityHint="Enter your email address"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={profile.phoneNumber}
          onChangeText={(text) => {
            const sanitized = sanitizePhoneNumber(text);
            updateField('phoneNumber', sanitized);
          }}
          keyboardType="phone-pad"
          accessibilityLabel="Phone number input"
          accessibilityHint="Enter your phone number"
        />
      </View>
    </>
  );
});

ProfileFormFields.displayName = 'ProfileFormFields';

const styles = StyleSheet.create({
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
});
