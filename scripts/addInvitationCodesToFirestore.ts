/**
 * Add Invitation Codes from File to Firestore
 * 
 * This script reads invitation codes from invitation_codes.txt and adds them to Firestore.
 * This makes them available for validation in the app.
 * 
 * Usage: npx ts-node scripts/addInvitationCodesToFirestore.ts
 * 
 * Note: This requires Firebase to be configured and you need to be authenticated.
 * For production, you should use Firebase Admin SDK or run this from a server.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeFirebase } from '../config/firebase.config';
import { logger } from '../utils/logger';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const CREATED_BY_EMAIL = 'shaouxyz@gmail.com'; // System/admin email

async function addCodesToFirestore() {
  try {
    // Initialize Firebase
    initializeFirebase();
    
    // Read codes from file
    const codesFilePath = path.join(process.cwd(), 'invitation_codes.txt');
    if (!fs.existsSync(codesFilePath)) {
      console.error('❌ Error: invitation_codes.txt not found!');
      console.error('   Run scripts/generateInvitationCodesFile.ts first to generate codes.');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(codesFilePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Extract codes (format: "1. CODE" or just "CODE")
    const codes: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Invitation') || trimmed.startsWith('Generated') || trimmed.startsWith('Total')) {
        continue;
      }
      
      // Match pattern like "1. CODE" or just "CODE"
      const match = trimmed.match(/^\d+\.\s*(.+)$/);
      if (match) {
        codes.push(match[1].trim());
      } else if (trimmed.length === 8 && /^[A-Z0-9]+$/.test(trimmed)) {
        // Just the code itself
        codes.push(trimmed);
      }
    }

    if (codes.length === 0) {
      console.error('❌ No codes found in file!');
      process.exit(1);
    }

    console.log(`\n📋 Found ${codes.length} invitation codes in file`);
    console.log(`🚀 Adding codes to Firestore...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Add each code to Firestore
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      try {
        // Note: createInvitationCode generates a new code, so we need to manually create the code
        // Instead, we'll use Firestore directly or create a helper function
        
        // For now, we'll use the service but it will generate a new code
        // We need to create codes with specific values
        console.log(`Adding code ${i + 1}/${codes.length}: ${code}...`);
        
        // We need to create the code directly in Firestore with the specific code value
        // Let's import Firestore functions
        const { getFirebaseFirestore } = await import('../config/firebase.config');
        const { collection, doc, setDoc, query, where, getDocs } = await import('firebase/firestore');
        
        const db = getFirebaseFirestore();
        const codesRef = collection(db, 'invitationCodes');
        
        // Check if code already exists
        const q = query(codesRef, where('code', '==', code));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log(`  ⚠️  Code ${code} already exists, skipping...`);
          continue;
        }
        
        // Create new code document
        const docRef = doc(codesRef);
        await setDoc(docRef, {
          code,
          createdBy: CREATED_BY_EMAIL,
          isUsed: false,
          createdAt: new Date().toISOString(),
        });
        
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`  ✅ Added ${i + 1} codes so far...`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Code ${code}: ${errorMsg}`);
        console.error(`  ❌ Failed to add code ${code}: ${errorMsg}`);
      }
    }

    console.log(`\n✅ Successfully added ${successCount} codes to Firestore`);
    if (errorCount > 0) {
      console.log(`❌ Failed to add ${errorCount} codes`);
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log(`\n📝 Codes are now available in Firestore and can be used in the app!`);
    console.log(`   No need to rebuild the APK - codes are stored in Firestore.`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error adding invitation codes to Firestore', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCodesToFirestore();
