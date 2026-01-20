// Data Migration Utilities
// Handles data versioning and migration for schema changes

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { safeParseJSON } from './schemaValidation';

const DATA_VERSION_KEY = 'dataVersion';
const CURRENT_DATA_VERSION = 2; // Increment when schema changes

interface Migration {
  version: number;
  migrate: () => Promise<void>;
}

/**
 * Get current data version
 */
export async function getDataVersion(): Promise<number> {
  try {
    const version = await AsyncStorage.getItem(DATA_VERSION_KEY);
    return version ? parseInt(version, 10) : 1; // Default to version 1 for existing data
  } catch (error) {
    logger.error('Error getting data version', error instanceof Error ? error : new Error(String(error)));
    return 1;
  }
}

/**
 * Set data version
 */
async function setDataVersion(version: number): Promise<void> {
  try {
    await AsyncStorage.setItem(DATA_VERSION_KEY, version.toString());
  } catch (error) {
    logger.error('Error setting data version', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Migration from version 1 to 2
 * - Migrates plain text passwords to hashed passwords
 * - Migrates single user to multi-user system
 */
async function migrateV1ToV2(): Promise<void> {
  try {
    logger.info('Starting migration from version 1 to 2');
    
    // Check if old user data exists
    const oldUserData = await AsyncStorage.getItem('user');
    if (oldUserData) {
      try {
        const user = safeParseJSON<{ email: string; password?: string; id?: string; createdAt?: string }>(
          oldUserData,
          (data): data is { email: string; password?: string; id?: string; createdAt?: string } => 
            typeof data === 'object' && data !== null && 'email' in data && typeof (data as { email: unknown }).email === 'string',
          null
        );
        
        if (!user) {
          return;
        }
        
        // If user has plain text password, migrate to new system
        if (user.password && typeof user.password === 'string') {
          // Import user management to create user with hashed password
          const { hashPassword } = await import('./security');
          
          // Check if user already exists in new system
          const { getUserByEmail } = await import('./userManagement');
          const existingUser = await getUserByEmail(user.email);
          
          if (!existingUser) {
            // Create user with hashed password
            const passwordHash = await hashPassword(user.password);
            const { getAllUsers } = await import('./userManagement');
            const users = await getAllUsers();
            
            users.push({
              email: user.email,
              passwordHash,
              id: user.id || Date.now().toString(),
              createdAt: user.createdAt || new Date().toISOString(),
            });
            
            await AsyncStorage.setItem('users', JSON.stringify(users));
            logger.info('Migrated user to new system', { email: user.email });
          }
        }
      } catch (error) {
        logger.error('Error migrating user data', error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    logger.info('Migration from version 1 to 2 completed');
  } catch (error) {
    logger.error('Migration error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    const currentVersion = await getDataVersion();
    
    if (currentVersion >= CURRENT_DATA_VERSION) {
      logger.info('Data is up to date', { currentVersion, targetVersion: CURRENT_DATA_VERSION });
      return;
    }
    
    logger.info('Starting data migrations', { 
      currentVersion, 
      targetVersion: CURRENT_DATA_VERSION 
    });
    
    const migrations: Migration[] = [
      { version: 2, migrate: migrateV1ToV2 },
    ];
    
    // Run migrations in order
    for (const migration of migrations) {
      if (currentVersion < migration.version) {
        logger.info(`Running migration to version ${migration.version}`);
        await migration.migrate();
        await setDataVersion(migration.version);
      }
    }
    
    logger.info('All migrations completed', { newVersion: CURRENT_DATA_VERSION });
  } catch (error) {
    logger.error('Migration failed', error instanceof Error ? error : new Error(String(error)));
    // Don't throw - allow app to continue even if migration fails
  }
}

/**
 * Initialize data migration on app start
 */
export async function initializeDataMigration(): Promise<void> {
  try {
    await runMigrations();
  } catch (error) {
    logger.error('Failed to initialize data migration', error instanceof Error ? error : new Error(String(error)));
  }
}
