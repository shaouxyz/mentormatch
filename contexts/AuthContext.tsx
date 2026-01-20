// Authentication Context
// Provides global state management for user authentication

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../utils/userManagement';
import { getCurrentProfile } from '../services/profileService';
import { isSessionValid, refreshSession } from '../utils/sessionManager';
import { logger } from '../utils/logger';
import { User } from '../types/types';
import { Profile } from '../types/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Manages global authentication state including:
 * - Current user information
 * - User profile
 * - Authentication status
 * - Session validation
 * 
 * @component
 * @param {ReactNode} children - Child components
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load authentication state from storage
   */
  const loadAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if session is valid
      const sessionValid = await isSessionValid();
      if (!sessionValid) {
        // Session expired, clear auth
        await clearAuth();
        return;
      }

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // Get user profile
      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      // Refresh session
      await refreshSession();
    } catch (error) {
      logger.error('Error loading auth state', error instanceof Error ? error : new Error(String(error)));
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    await loadAuth();
  }, [loadAuth]);

  /**
   * Clear authentication state
   */
  const clearAuth = useCallback(async () => {
    setUser(null);
    setProfile(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('profile');
    await AsyncStorage.removeItem('isAuthenticated');
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    refreshAuth,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * 
 * @returns {AuthContextType} Authentication context value
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
