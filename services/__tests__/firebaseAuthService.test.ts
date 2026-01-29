/**
 * Firebase Auth Service Tests
 * 
 * Tests for services/firebaseAuthService.ts - Firebase authentication service
 */

// Mock firebase/auth first
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  User: jest.fn(),
  UserCredential: jest.fn(),
}));

jest.mock('../../config/firebase.config');
jest.mock('../../utils/logger');

// Unmock the service we're testing
jest.unmock('../firebaseAuthService');

import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseSignOut,
  getCurrentFirebaseUser,
  firebaseSendPasswordReset,
  firebaseUpdateUserProfile,
  isFirebaseUserSignedIn,
  getFirebaseUserToken,
} from '../firebaseAuthService';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseConfig from '../../config/firebase.config';
import * as logger from '../../utils/logger';

const mockFirebaseAuth = firebaseAuth as any;
const mockFirebaseConfig = firebaseConfig as any;
const mockLogger = logger as any;

describe('Firebase Auth Service', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockUserCredential = {
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseConfig.getFirebaseAuth.mockReturnValue({});
  });

  describe('firebaseSignUp', () => {
    it('should sign up user successfully', async () => {
      mockFirebaseAuth.createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockFirebaseAuth.updateProfile.mockResolvedValue(undefined);

      const result = await firebaseSignUp('test@example.com', 'password123', 'Test User');

      expect(result).toEqual(mockUserCredential);
      expect(mockFirebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'test@example.com',
        'password123'
      );
      expect(mockFirebaseAuth.updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Test User' });
    });

    it('should sign up user without display name', async () => {
      mockFirebaseAuth.createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const result = await firebaseSignUp('test@example.com', 'password123');

      expect(result).toEqual(mockUserCredential);
      expect(mockFirebaseAuth.updateProfile).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Sign up failed');
      mockFirebaseAuth.createUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(firebaseSignUp('test@example.com', 'password123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in firebaseSignUp', async () => {
      mockFirebaseAuth.createUserWithEmailAndPassword.mockRejectedValue('Sign up failed string');

      await expect(firebaseSignUp('test@example.com', 'password123')).rejects.toBe('Sign up failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('firebaseSignIn', () => {
    it('should sign in user successfully', async () => {
      mockFirebaseAuth.signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const result = await firebaseSignIn('test@example.com', 'password123');

      expect(result).toEqual(mockUserCredential);
      expect(mockFirebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'test@example.com',
        'password123'
      );
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Sign in failed');
      mockFirebaseAuth.signInWithEmailAndPassword.mockRejectedValue(error);

      await expect(firebaseSignIn('test@example.com', 'password123')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in firebaseSignIn', async () => {
      mockFirebaseAuth.signInWithEmailAndPassword.mockRejectedValue('Sign in failed string');

      await expect(firebaseSignIn('test@example.com', 'password123')).rejects.toBe('Sign in failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('firebaseSignOut', () => {
    it('should sign out user successfully', async () => {
      mockFirebaseAuth.signOut.mockResolvedValue(undefined);

      await firebaseSignOut();

      expect(mockFirebaseAuth.signOut).toHaveBeenCalledWith({});
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Sign out failed');
      mockFirebaseAuth.signOut.mockRejectedValue(error);

      await expect(firebaseSignOut()).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in firebaseSignOut', async () => {
      mockFirebaseAuth.signOut.mockRejectedValue('Sign out failed string');

      await expect(firebaseSignOut()).rejects.toBe('Sign out failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('getCurrentFirebaseUser', () => {
    it('should return current user when authenticated', () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: mockUser,
      });

      const user = getCurrentFirebaseUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null when not authenticated', () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: null,
      });

      const user = getCurrentFirebaseUser();

      expect(user).toBeNull();
    });
  });

  describe('firebaseSendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      mockFirebaseAuth.sendPasswordResetEmail.mockResolvedValue(undefined);

      await firebaseSendPasswordReset('test@example.com');

      expect(mockFirebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith({}, 'test@example.com');
    });

    it('should handle errors and throw', async () => {
      const error = new Error('Password reset failed');
      mockFirebaseAuth.sendPasswordResetEmail.mockRejectedValue(error);

      await expect(firebaseSendPasswordReset('test@example.com')).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in firebaseSendPasswordReset', async () => {
      mockFirebaseAuth.sendPasswordResetEmail.mockRejectedValue('Password reset failed string');

      await expect(firebaseSendPasswordReset('test@example.com')).rejects.toBe('Password reset failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('firebaseUpdateUserProfile', () => {
    it('should update user profile successfully', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: mockUser,
      });
      mockFirebaseAuth.updateProfile.mockResolvedValue(undefined);

      await firebaseUpdateUserProfile({ displayName: 'Updated Name' });

      expect(mockFirebaseAuth.updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Updated Name' });
    });

    it('should throw error when no user is authenticated', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: null,
      });

      await expect(firebaseUpdateUserProfile({ displayName: 'Updated Name' })).rejects.toThrow('No user is currently signed in');
    });

    it('should handle errors and throw', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: mockUser,
      });
      const error = new Error('Update failed');
      mockFirebaseAuth.updateProfile.mockRejectedValue(error);

      await expect(firebaseUpdateUserProfile({ displayName: 'Updated Name' })).rejects.toThrow();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in firebaseUpdateUserProfile', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: mockUser,
      });
      mockFirebaseAuth.updateProfile.mockRejectedValue('Update failed string');

      await expect(firebaseUpdateUserProfile({ displayName: 'Updated Name' })).rejects.toBe('Update failed string');
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });

  describe('isFirebaseUserSignedIn', () => {
    it('should return true when user is signed in', () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: mockUser,
      });

      const isSignedIn = isFirebaseUserSignedIn();

      expect(isSignedIn).toBe(true);
    });

    it('should return false when user is not signed in', () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: null,
      });

      const isSignedIn = isFirebaseUserSignedIn();

      expect(isSignedIn).toBe(false);
    });
  });

  describe('getFirebaseUserToken', () => {
    it('should return token when user is authenticated', async () => {
      const mockToken = 'test-token-123';
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: {
          ...mockUser,
          getIdToken: jest.fn().mockResolvedValue(mockToken),
        },
      });

      const token = await getFirebaseUserToken();

      expect(token).toBe(mockToken);
    });

    it('should return null when user is not authenticated', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: null,
      });

      const token = await getFirebaseUserToken();

      expect(token).toBeNull();
    });

    it('should handle errors and return null', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: {
          ...mockUser,
          getIdToken: jest.fn().mockRejectedValue(new Error('Token error')),
        },
      });

      const token = await getFirebaseUserToken();

      expect(token).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error thrown in getFirebaseUserToken', async () => {
      mockFirebaseConfig.getFirebaseAuth.mockReturnValue({
        currentUser: {
          ...mockUser,
          getIdToken: jest.fn().mockRejectedValue('Token error string'),
        },
      });

      const token = await getFirebaseUserToken();

      expect(token).toBeNull();
      expect(mockLogger.logger.error).toHaveBeenCalled();
    });
  });
});
