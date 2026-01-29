/**
 * Tests for Hybrid Authentication Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Unmock the hybrid services to test them directly
jest.unmock('../hybridAuthService');
jest.unmock('../hybridProfileService');

import { hybridSignUp, hybridSignIn, isFirebaseSyncAvailable } from '../hybridAuthService';
import * as firebaseConfig from '../../config/firebase.config';
import * as firebaseAuthService from '../firebaseAuthService';
import { createUser, authenticateUser } from '../../utils/userManagement';

// Mock dependencies
jest.mock('../../config/firebase.config');
jest.mock('../firebaseAuthService');
jest.mock('../../utils/userManagement');

describe('Hybrid Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('hybridSignUp', () => {
    it('should create user locally when Firebase is not configured', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
        createdAt: new Date().toISOString(),
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (createUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await hybridSignUp('test@example.com', 'password123');

      expect(createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should create user locally and sync to Firebase when configured', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
        createdAt: new Date().toISOString(),
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockResolvedValue({
        user: { uid: 'firebase123' },
      });

      const result = await hybridSignUp('test@example.com', 'password123');

      expect(createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUser);
    });

    it('should continue if Firebase sync fails', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
        createdAt: new Date().toISOString(),
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      const result = await hybridSignUp('test@example.com', 'password123');

      expect(createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should handle non-Error thrown in Firebase signup sync', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
        createdAt: new Date().toISOString(),
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockRejectedValue(
        'Firebase error string'
      );

      const result = await hybridSignUp('test@example.com', 'password123');

      expect(createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should handle non-Error thrown in outer catch block of signup', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (createUser as jest.Mock).mockRejectedValue('User creation error string');

      await expect(hybridSignUp('test@example.com', 'password123')).rejects.toBe(
        'User creation error string'
      );
    });

    it('should throw error if local user creation fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (createUser as jest.Mock).mockRejectedValue(new Error('User already exists'));

      await expect(hybridSignUp('test@example.com', 'password123')).rejects.toThrow(
        'User already exists'
      );
    });
  });

  describe('hybridSignIn', () => {
    it('should authenticate user locally when Firebase is not configured', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignIn).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should authenticate locally and sync with Firebase when configured', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockResolvedValue({
        user: { uid: 'firebase123' },
      });

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUser);
    });

    it('should continue if Firebase authentication fails', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue(
        new Error('Firebase error')
      );

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error if local authentication fails', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (authenticateUser as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(hybridSignIn('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should create local user when Firebase auth succeeds but local auth fails', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockResolvedValue({
        user: { uid: 'firebase123', email: 'test@example.com' },
      });
      (authenticateUser as jest.Mock).mockRejectedValue(new Error('Local auth failed'));
      (createUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should create Firebase account when user exists locally but not in Firebase', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockResolvedValue({
        user: { uid: 'firebase123', email: 'test@example.com' },
      });

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should create Firebase account when user exists locally but Firebase returns invalid-credential', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid credential',
      });
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockResolvedValue({
        user: { uid: 'firebase123', email: 'test@example.com' },
      });

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should continue with local auth when Firebase account creation fails for existing local user', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use',
      });

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should handle non-Error thrown when creating Firebase account for existing local user', async () => {
      const mockUser = {
        email: 'test@example.com',
        id: '123',
        passwordHash: 'hash123',
      };

      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });
      (authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (firebaseAuthService.firebaseSignUp as jest.Mock).mockRejectedValue('Firebase signup error string');

      const result = await hybridSignIn('test@example.com', 'password123');

      expect(firebaseAuthService.firebaseSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(firebaseAuthService.firebaseSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should throw local error when both Firebase and local authentication fail', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });
      (authenticateUser as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await expect(hybridSignIn('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    it('should handle non-Error thrown when both Firebase and local authentication fail', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);
      (firebaseAuthService.firebaseSignIn as jest.Mock).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });
      (authenticateUser as jest.Mock).mockRejectedValue('Invalid credentials string');

      await expect(hybridSignIn('test@example.com', 'wrong')).rejects.toBe('Invalid credentials string');
    });

    it('should handle non-Error thrown in outer catch block of signin', async () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);
      (authenticateUser as jest.Mock).mockRejectedValue('Authentication error string');

      await expect(hybridSignIn('test@example.com', 'password123')).rejects.toBe('Authentication error string');
    });
  });

  describe('isFirebaseSyncAvailable', () => {
    it('should return true when Firebase is configured', () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(true);

      expect(isFirebaseSyncAvailable()).toBe(true);
    });

    it('should return false when Firebase is not configured', () => {
      (firebaseConfig.isFirebaseConfigured as jest.Mock).mockReturnValue(false);

      expect(isFirebaseSyncAvailable()).toBe(false);
    });
  });
});
