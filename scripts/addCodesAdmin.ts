/**
 * Add Invitation Codes to Firestore using Firebase Admin SDK
 * 
 * This script reads codes from invitation_codes.txt and adds them to Firestore.
 * 
 * Prerequisites:
 * 1. Download service account key from Firebase Console:
 *    - Project Settings > Service Accounts > Generate new private key
 *    - Save as serviceAccountKey.json in project root
 * 2. Install: npm install firebase-admin
 * 
 * Usage: npx ts-node scripts/addCodesAdmin.ts
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Admin SDK
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found!');
  console.error('\nTo get the service account key:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save it as serviceAccountKey.json in the project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin if not already initialized
if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    // If already initialized, that's fine
    if (error && !error.message?.includes('already been initialized')) {
      throw error;
    }
  }
}

const db = admin.firestore();
const CREATED_BY = 'shaouxyz@gmail.com';

async function addCodes() {
  try {
    // Read codes from file
    const codesFile = path.join(process.cwd(), 'invitation_codes.txt');
    
    if (!fs.existsSync(codesFile)) {
      console.error('❌ Error: invitation_codes.txt not found!');
      console.error('   Run scripts/generateInvitationCodesFile.ts first.');
      process.exit(1);
    }

    const content = fs.readFileSync(codesFile, 'utf8');
    const lines = content.split('\n');
    
    const codes: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip header lines
      if (!trimmed || trimmed.startsWith('Invitation') || trimmed.startsWith('Generated') || trimmed.startsWith('Total')) {
        continue;
      }
      // Match pattern like "1. CODE" or just "CODE"
      const match = trimmed.match(/^\d+\.\s*(.+)$/);
      if (match) {
        codes.push(match[1].trim());
      } else if (trimmed.length === 8 && /^[A-Z0-9]+$/.test(trimmed)) {
        codes.push(trimmed);
      }
    }

    if (codes.length === 0) {
      console.error('❌ No codes found in file!');
      process.exit(1);
    }

    console.log(`\n📋 Found ${codes.length} invitation codes`);
    console.log(`🚀 Adding codes to Firestore...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Add each code to Firestore
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      try {
        // Check if code already exists
        const existing = await db.collection('invitationCodes')
          .where('code', '==', code)
          .limit(1)
          .get();

        if (!existing.empty) {
          console.log(`  ⚠️  Code ${code} already exists, skipping...`);
          continue;
        }

        // Add code to Firestore
        await db.collection('invitationCodes').add({
          code,
          createdBy: CREATED_BY,
          isUsed: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`  ✅ Added ${i + 1} codes so far...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to add code ${code}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`\n✅ Successfully added ${successCount} codes to Firestore`);
    if (errorCount > 0) {
      console.log(`❌ Failed to add ${errorCount} codes`);
    }
    
    console.log(`\n📝 Codes are now available in Firestore!`);
    console.log(`   You can use them in the app without rebuilding the APK.`);
    console.log(`   Try signing up with code: ${codes[0]}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

addCodes();
