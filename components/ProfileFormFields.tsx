// Reusable Profile Form Fields Component
// Reduces code duplication between create and edit profile screens

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAX_NAME_LENGTH, MAX_EXPERTISE_LENGTH, MAX_INTEREST_LENGTH, MAX_LOCATION_LENGTH, MAX_YEARS, CASPA_ROLE_OPTIONS, MAX_LTM_NUMBER_LENGTH } from '../utils/constants';
import { sanitizeString, sanitizeTextField, sanitizeEmail, sanitizeNumber } from '../utils/security';

interface ProfileFormData {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: string;
  interestYears: string;
  email: string;
  location: string;
  caspaRole: string;
  ltmNumber: string;
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
  const [caspaRoleMenuVisible, setCaspaRoleMenuVisible] = useState(false);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  const selectCaspaRole = (option: string) => {
    updateField('caspaRole', option);
    setCaspaRoleMenuVisible(false);
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
            const sanitized = sanitizeTextField(text);
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
            const sanitized = sanitizeTextField(text);
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
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., San Francisco, CA or New York City"
          value={profile.location}
          onChangeText={(text) => {
            const sanitized = sanitizeTextField(text);
            if (sanitized.length <= MAX_LOCATION_LENGTH) {
              updateField('location', sanitized);
            }
          }}
          maxLength={MAX_LOCATION_LENGTH}
          accessibilityLabel="Location input"
          accessibilityHint="Enter your city or region"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>CASPA Role</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setCaspaRoleMenuVisible(true)}
          accessibilityLabel="CASPA Role selector"
          accessibilityHint="Tap to open dropdown and select your CASPA role"
        >
          <Text style={profile.caspaRole ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
            {profile.caspaRole || 'Select CASPA Role'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>

        <Modal
          visible={caspaRoleMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCaspaRoleMenuVisible(false)}
        >
          <Pressable style={styles.dropdownBackdrop} onPress={() => setCaspaRoleMenuVisible(false)}>
            <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
              <Text style={styles.dropdownTitle}>CASPA Role</Text>
              <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                {CASPA_ROLE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.dropdownOption, profile.caspaRole === option && styles.dropdownOptionSelected]}
                    onPress={() => selectCaspaRole(option)}
                    accessibilityLabel={`CASPA Role ${option}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.dropdownOptionText, profile.caspaRole === option && styles.dropdownOptionTextSelected]}>
                      {option}
                    </Text>
                    {profile.caspaRole === option && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.dropdownCancel}
                onPress={() => setCaspaRoleMenuVisible(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.dropdownCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>LTM Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter LTM number"
          value={profile.ltmNumber}
          onChangeText={(text) => {
            const sanitized = sanitizeTextField(text);
            if (sanitized.length <= MAX_LTM_NUMBER_LENGTH) {
              updateField('ltmNumber', sanitized);
            }
          }}
          maxLength={MAX_LTM_NUMBER_LENGTH}
          accessibilityLabel="LTM Number input"
          accessibilityHint="Enter your LTM number"
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    minHeight: 52,
  },
  pickerValue: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
    flex: 1,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#f1f5f9',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  dropdownOptionTextSelected: {
    fontWeight: '600',
    color: '#2563eb',
  },
  dropdownCancel: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dropdownCancelText: {
    fontSize: 16,
    color: '#64748b',
  },
});
