// Validation Utilities

import { ERROR_MESSAGES, MAX_NAME_LENGTH, MAX_EXPERTISE_LENGTH, MAX_INTEREST_LENGTH, MAX_YEARS, EMAIL_REGEX, PHONE_REGEX } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ProfileValidationData {
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: string;
  interestYears: string;
  email: string;
  phoneNumber: string;
}

/**
 * Validates profile data
 */
export function validateProfile(data: ProfileValidationData): ValidationResult {
  // Name validation
  if (!data.name.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.NAME_REQUIRED };
  }
  if (data.name.trim().length > MAX_NAME_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.NAME_TOO_LONG };
  }

  // Expertise validation
  if (!data.expertise.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.EXPERTISE_REQUIRED };
  }
  if (data.expertise.trim().length > MAX_EXPERTISE_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.EXPERTISE_TOO_LONG };
  }

  // Interest validation
  if (!data.interest.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.INTEREST_REQUIRED };
  }
  if (data.interest.trim().length > MAX_INTEREST_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.INTEREST_TOO_LONG };
  }

  // Expertise years validation
  const expertiseYearsNum = Number(data.expertiseYears);
  if (!data.expertiseYears || isNaN(expertiseYearsNum) || expertiseYearsNum < 0) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EXPERTISE_YEARS };
  }
  if (expertiseYearsNum > MAX_YEARS) {
    return { isValid: false, error: ERROR_MESSAGES.YEARS_TOO_LARGE };
  }

  // Interest years validation
  const interestYearsNum = Number(data.interestYears);
  if (!data.interestYears || isNaN(interestYearsNum) || interestYearsNum < 0) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_INTEREST_YEARS };
  }
  if (interestYearsNum > MAX_YEARS) {
    return { isValid: false, error: ERROR_MESSAGES.YEARS_TOO_LARGE };
  }

  // Email validation
  if (!data.email.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.EMAIL_REQUIRED };
  }
  if (!EMAIL_REGEX.test(data.email.trim())) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }

  // Phone validation
  if (!data.phoneNumber.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.PHONE_REQUIRED };
  }
  if (!PHONE_REGEX.test(data.phoneNumber.trim())) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_PHONE };
  }

  return { isValid: true };
}

/**
 * Validates email format (RFC 5322 compliant)
 * Enhanced validation with better regex pattern
 */
export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.EMAIL_REQUIRED };
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic structure check
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Split into local and domain parts
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  const [localPart, domainPart] = parts;
  
  // Validate local part (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Validate domain part (after @)
  if (domainPart.length === 0 || domainPart.length > 255) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Check for valid domain structure
  const domainParts = domainPart.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Check TLD (top-level domain)
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Enhanced regex pattern (RFC 5322 compliant subset)
  // Allows most valid email formats while blocking obviously invalid ones
  const enhancedEmailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
  
  if (!enhancedEmailRegex.test(trimmedEmail)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Additional checks for common issues
  if (trimmedEmail.startsWith('.') || trimmedEmail.startsWith('@') || 
      trimmedEmail.endsWith('.') || trimmedEmail.endsWith('@')) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  // Check for consecutive dots
  if (trimmedEmail.includes('..') || domainPart.includes('..')) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  return { isValid: true };
}

/**
 * Validates password
 */
export function validatePassword(password: string, confirmPassword?: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: ERROR_MESSAGES.FILL_ALL_FIELDS };
  }
  if (password.length < 6) {
    return { isValid: false, error: ERROR_MESSAGES.PASSWORD_TOO_SHORT };
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.PASSWORD_MISMATCH };
  }
  return { isValid: true };
}

/**
 * Sanitizes string input by trimming and removing dangerous characters
 * @deprecated Use sanitizeString from utils/security.ts instead
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
}
