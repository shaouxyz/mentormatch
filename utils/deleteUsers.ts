/**
 * Temporary utility to delete specific users from local storage
 * 
 * Usage:
 * 1. Import this in app/index.tsx
 * 2. Call deleteSpecificUsers() once
 * 3. Remove the import and call
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export async function deleteSpecificUsers() {
  try {
    const emailsToDelete = [
      'shaouxyz@hotmail.com',
      'shaouxyz@gmail.com'
    ];

    // Delete from users array
    const usersData = await AsyncStorage.getItem('users');
    if (usersData) {
      const users = JSON.parse(usersData);
      const filtered = users.filter((u: any) => !emailsToDelete.includes(u.email));
      await AsyncStorage.setItem('users', JSON.stringify(filtered));
      logger.info('Users deleted from local storage', { 
        deleted: users.length - filtered.length,
        remaining: filtered.length 
      });
    }

    // Delete from profiles array
    const profilesData = await AsyncStorage.getItem('allProfiles');
    if (profilesData) {
      const profiles = JSON.parse(profilesData);
      const filtered = profiles.filter((p: any) => !emailsToDelete.includes(p.email));
      await AsyncStorage.setItem('allProfiles', JSON.stringify(filtered));
      logger.info('Profiles deleted from local storage', { 
        deleted: profiles.length - filtered.length,
        remaining: filtered.length 
      });
    }

    // Clear current user if it's one of the deleted emails
    const currentUserData = await AsyncStorage.getItem('user');
    if (currentUserData) {
      const currentUser = JSON.parse(currentUserData);
      if (emailsToDelete.includes(currentUser.email)) {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('profile');
        await AsyncStorage.setItem('isAuthenticated', 'false');
        logger.info('Current user cleared', { email: currentUser.email });
      }
    }

    logger.info('User deletion complete', { emails: emailsToDelete });
  } catch (error) {
    logger.error('Error deleting users', error instanceof Error ? error : new Error(String(error)));
  }
}
