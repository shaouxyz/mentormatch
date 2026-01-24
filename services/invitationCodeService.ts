/**
 * Invitation Code Service
 * 
 * Handles invitation code generation, validation, and usage tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvitationCode } from '@/types/types';
import { logger } from '@/utils/logger';
import { isFirebaseConfigured } from '@/config/firebase.config';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/config/firebase.config';

const INVITATION_CODES_KEY = 'invitationCodes';
const INVITATION_CODES_COLLECTION = 'invitationCodes';

/**
 * Generate a random invitation code
 */
function generateInvitationCode(): string {
  // Generate a 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get all invitation codes from local storage
 */
async function getLocalInvitationCodes(): Promise<InvitationCode[]> {
  try {
    const codesData = await AsyncStorage.getItem(INVITATION_CODES_KEY);
    return codesData ? JSON.parse(codesData) : [];
  } catch (error) {
    logger.error('Error getting local invitation codes', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save invitation codes to local storage
 */
async function saveLocalInvitationCodes(codes: InvitationCode[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INVITATION_CODES_KEY, JSON.stringify(codes));
  } catch (error) {
    logger.error('Error saving local invitation codes', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Create a new invitation code
 */
export async function createInvitationCode(createdBy: string): Promise<InvitationCode> {
  try {
    const code = generateInvitationCode();
    const invitationCode: InvitationCode = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code,
      createdBy,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const codesRef = collection(db, INVITATION_CODES_COLLECTION);
        const docRef = doc(codesRef);
        
        await setDoc(docRef, {
          ...invitationCode,
          id: docRef.id,
        });
        
        invitationCode.id = docRef.id;
        logger.info('Invitation code created in Firestore', { codeId: docRef.id, code });
      } catch (firebaseError) {
        logger.warn('Failed to create invitation code in Firestore, using local only', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Save locally
    const localCodes = await getLocalInvitationCodes();
    localCodes.push(invitationCode);
    await saveLocalInvitationCodes(localCodes);

    logger.info('Invitation code created', { code, createdBy });
    return invitationCode;
  } catch (error) {
    logger.error('Error creating invitation code', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Validate and use an invitation code
 */
export async function useInvitationCode(code: string, usedBy: string): Promise<boolean> {
  try {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const codesRef = collection(db, INVITATION_CODES_COLLECTION);
        const q = query(codesRef, where('code', '==', code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Check local storage as fallback
          const localCodes = await getLocalInvitationCodes();
          const localCode = localCodes.find(c => c.code === code && !c.isUsed);
          
          if (!localCode) {
            logger.warn('Invitation code not found', { code });
            return false;
          }

          // Mark as used locally
          localCode.isUsed = true;
          localCode.usedBy = usedBy;
          localCode.usedAt = new Date().toISOString();
          await saveLocalInvitationCodes(localCodes);
          logger.info('Invitation code used (local only)', { code, usedBy });
          return true;
        }

        const docSnap = querySnapshot.docs[0];
        const codeData = docSnap.data() as InvitationCode;

        if (codeData.isUsed) {
          logger.warn('Invitation code already used', { code, usedBy: codeData.usedBy });
          return false;
        }

        // Mark as used in Firestore
        await updateDoc(docSnap.ref, {
          isUsed: true,
          usedBy,
          usedAt: new Date().toISOString(),
        });

        // Also update locally
        const localCodes = await getLocalInvitationCodes();
        const localCodeIndex = localCodes.findIndex(c => c.code === code);
        if (localCodeIndex !== -1) {
          localCodes[localCodeIndex].isUsed = true;
          localCodes[localCodeIndex].usedBy = usedBy;
          localCodes[localCodeIndex].usedAt = new Date().toISOString();
          await saveLocalInvitationCodes(localCodes);
        }

        logger.info('Invitation code used', { code, usedBy });
        return true;
      } catch (firebaseError) {
        logger.warn('Failed to use invitation code in Firestore, trying local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Local-only mode
    const localCodes = await getLocalInvitationCodes();
    const codeIndex = localCodes.findIndex(c => c.code === code);

    if (codeIndex === -1) {
      logger.warn('Invitation code not found', { code });
      return false;
    }

    if (localCodes[codeIndex].isUsed) {
      logger.warn('Invitation code already used', { code, usedBy: localCodes[codeIndex].usedBy });
      return false;
    }

    localCodes[codeIndex].isUsed = true;
    localCodes[codeIndex].usedBy = usedBy;
    localCodes[codeIndex].usedAt = new Date().toISOString();
    await saveLocalInvitationCodes(localCodes);

    logger.info('Invitation code used (local only)', { code, usedBy });
    return true;
  } catch (error) {
    logger.error('Error using invitation code', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Check if an invitation code is valid (exists and not used)
 */
export async function isValidInvitationCode(code: string): Promise<boolean> {
  try {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const codesRef = collection(db, INVITATION_CODES_COLLECTION);
        const q = query(codesRef, where('code', '==', code));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const codeData = querySnapshot.docs[0].data() as InvitationCode;
          return !codeData.isUsed;
        }
      } catch (firebaseError) {
        logger.warn('Failed to check invitation code in Firestore, trying local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Check local storage
    const localCodes = await getLocalInvitationCodes();
    const codeData = localCodes.find(c => c.code === code);
    return codeData ? !codeData.isUsed : false;
  } catch (error) {
    logger.error('Error checking invitation code validity', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get all unused invitation codes for a user
 */
export async function getUnusedInvitationCodes(userEmail: string): Promise<InvitationCode[]> {
  try {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseFirestore();
        const codesRef = collection(db, INVITATION_CODES_COLLECTION);
        const q = query(
          codesRef,
          where('createdBy', '==', userEmail),
          where('isUsed', '==', false)
        );
        const querySnapshot = await getDocs(q);
        
        const codes: InvitationCode[] = [];
        querySnapshot.forEach((doc) => {
          codes.push({ id: doc.id, ...doc.data() } as InvitationCode);
        });
        
        return codes;
      } catch (firebaseError) {
        logger.warn('Failed to get invitation codes from Firestore, trying local', {
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        });
      }
    }

    // Local-only mode
    const localCodes = await getLocalInvitationCodes();
    return localCodes.filter(c => c.createdBy === userEmail && !c.isUsed);
  } catch (error) {
    logger.error('Error getting unused invitation codes', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Generate multiple invitation codes
 */
export async function generateMultipleInvitationCodes(
  count: number,
  createdBy: string
): Promise<InvitationCode[]> {
  try {
    const codes: InvitationCode[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = await createInvitationCode(createdBy);
      codes.push(code);
    }

    logger.info('Multiple invitation codes generated', { count, createdBy });
    return codes;
  } catch (error) {
    logger.error('Error generating multiple invitation codes', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
