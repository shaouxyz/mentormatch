// User Management Utilities
// Provides multi-user support and user account management

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './security';
import { hashPassword, verifyPassword } from './security';
import { logger } from './logger';
import { validateUserSchema } from './schemaValidation';
import { safeParseJSON } from './schemaValidation';

export interface User {
  email: string;
  passwordHash: string; // Hashed password, not plain text
  id: string;
  createdAt: string;
  isTestAccount?: boolean;
}

const USERS_STORAGE_KEY = 'users';
const CURRENT_USER_EMAIL_KEY = 'currentUserEmail';

/**
 * Get all users from storage
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (!usersData) {
      return [];
    }
    
    const users = safeParseJSON<User[]>(
      usersData,
      (data): data is User[] => {
        if (!Array.isArray(data)) return false;
        return data.every(user => validateUserSchema(user));
      },
      []
    );
    
    return users || [];
  } catch (error) {
    logger.error('Error getting all users', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find(u => u.email === email) || null;
}

/**
 * Create a new user account
 */
export async function createUser(email: string, password: string): Promise<User> {
  // Normalize email before checking for duplicates
  const normalizedEmail = email.trim().toLowerCase();
  
  // Check if user already exists (using normalized email)
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  const user: User = {
    email: normalizedEmail,
    passwordHash,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  // Add to users array
  const users = await getAllUsers();
  users.push(user);
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  logger.info('User created', { email: user.email, id: user.id });
  return user;
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // If the stored hash is legacy format, upgrade it after successful login
  if (!user.passwordHash.includes(':')) {
    try {
      await updateUserPassword(email, password);
      logger.info('Upgraded legacy password hash', { email });
    } catch (error) {
      logger.warn('Failed to upgrade legacy password hash', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return user;
}

/**
 * Set current user (store email in secure storage)
 */
export async function setCurrentUser(email: string): Promise<void> {
  await SecureStorage.setItem(CURRENT_USER_EMAIL_KEY, email);
  await AsyncStorage.setItem('isAuthenticated', 'true');
}

/**
 * Get current user email
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  return await SecureStorage.getItem(CURRENT_USER_EMAIL_KEY);
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const email = await getCurrentUserEmail();
  if (!email) {
    return null;
  }
  return await getUserByEmail(email);
}

/**
 * Clear current user session
 */
export async function clearCurrentUser(): Promise<void> {
  await SecureStorage.removeItem(CURRENT_USER_EMAIL_KEY);
  await AsyncStorage.removeItem('isAuthenticated');
}

/**
 * Update user password
 */
export async function updateUserPassword(email: string, newPassword: string): Promise<void> {
  const users = await getAllUsers();
  const userIndex = users.findIndex(u => u.email === email);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  const newPasswordHash = await hashPassword(newPassword);
  users[userIndex].passwordHash = newPasswordHash;
  
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  logger.info('User password updated', { email });
}
