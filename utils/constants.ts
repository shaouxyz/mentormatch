// Application Constants

// Match Scoring
export const MATCH_SCORE_EXPERTISE_INTEREST = 50;
export const MATCH_SCORE_INTEREST_EXPERTISE = 50;
export const MATCH_SCORE_THRESHOLD = 50; // Minimum score to show "Good Match" badge

// Input Limits
export const MAX_NAME_LENGTH = 100;
export const MAX_EXPERTISE_LENGTH = 200;
export const MAX_INTEREST_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 254; // RFC 5321
export const MAX_PHONE_LENGTH = 20;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_YEARS = 100; // Reasonable upper limit for years of experience
export const MIN_PASSWORD_LENGTH = 6;

// Performance & Pagination
export const MAX_PROFILES_TO_LOAD = 100; // Limit profiles loaded at once to prevent memory issues
export const PROFILES_PER_PAGE = 20; // For future pagination implementation

// Validation Patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[\d\s\-\+\(\)]+$/;

// AsyncStorage Keys
export const STORAGE_KEYS = {
  USER: 'user',
  PROFILE: 'profile',
  IS_AUTHENTICATED: 'isAuthenticated',
  ALL_PROFILES: 'allProfiles',
  MENTORSHIP_REQUESTS: 'mentorshipRequests',
  TEST_ACCOUNTS: 'testAccounts',
  TEST_ACCOUNTS_INITIALIZED: 'testAccountsInitialized',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  FILL_ALL_FIELDS: 'Please fill in all fields',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Invalid email or password',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  NAME_REQUIRED: 'Please enter your name',
  EXPERTISE_REQUIRED: 'Please enter your expertise area',
  INTEREST_REQUIRED: 'Please enter your interest area',
  EMAIL_REQUIRED: 'Please enter your email',
  PHONE_REQUIRED: 'Please enter your phone number',
  INVALID_EXPERTISE_YEARS: 'Please enter a valid number of years for expertise',
  INVALID_INTEREST_YEARS: 'Please enter a valid number of years for interest',
  INVALID_PHONE: 'Please enter a valid phone number',
  NAME_TOO_LONG: `Name must be less than ${MAX_NAME_LENGTH} characters`,
  EXPERTISE_TOO_LONG: `Expertise must be less than ${MAX_EXPERTISE_LENGTH} characters`,
  INTEREST_TOO_LONG: `Interest must be less than ${MAX_INTEREST_LENGTH} characters`,
  YEARS_TOO_LARGE: `Years of experience cannot exceed ${MAX_YEARS} years`,
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_CREATED: 'Profile created successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  REQUEST_SENT: 'Your mentorship request has been sent successfully!',
  ACCOUNT_CREATED: 'Account created successfully!',
} as const;
