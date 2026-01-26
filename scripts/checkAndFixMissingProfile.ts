/**
 * Check and Fix Missing Profile in Firestore
 * 
 * This script checks if a user exists in Firebase Auth but doesn't have a profile in Firestore,
 * and creates the profile if it's missing.
 * 
 * Usage: npx ts-node scripts/checkAndFixMissingProfile.ts shaouxyz@gmail.com
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node scripts/checkAndFixMissingProfile.ts <email>');
  process.exit(1);
}

async function checkAndFixProfile() {
  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.error('Error: serviceAccountKey.json not found!');
        console.error('You need to download the service account key from Firebase Console:');
        console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
        console.error('2. Click "Generate new private key"');
        console.error('3. Save it as serviceAccountKey.json in the project root');
        process.exit(1);
      }

      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    console.log(`\n=== Checking user: ${email} ===\n`);

    // Check if user exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
      console.log('✅ User found in Firebase Auth');
      console.log(`   UID: ${firebaseUser.uid}`);
      console.log(`   Email: ${firebaseUser.email}`);
      console.log(`   Created: ${firebaseUser.metadata.creationTime}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User NOT found in Firebase Auth');
        console.log('   The user needs to sign up first.');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Check if profile exists in Firestore
    const profileRef = firestore.collection('profiles').doc(email);
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
      console.log('\n✅ Profile found in Firestore');
      const profileData = profileDoc.data();
      console.log(`   Name: ${profileData?.name || 'N/A'}`);
      console.log(`   Email: ${profileData?.email || 'N/A'}`);
      console.log(`   Expertise: ${profileData?.expertise || 'N/A'}`);
      console.log(`   Interest: ${profileData?.interest || 'N/A'}`);
      console.log('\n✅ Everything is in sync!');
      process.exit(0);
    } else {
      console.log('\n❌ Profile NOT found in Firestore');
      console.log('\n⚠️  User exists in Firebase Auth but profile is missing in Firestore.');
      console.log('\nPossible reasons:');
      console.log('1. Profile was created before Firebase was configured');
      console.log('2. Firebase Auth state wasn\'t available when profile was created');
      console.log('3. Profile creation failed silently');
      console.log('\nTo fix this:');
      console.log('1. The user should log in to the app');
      console.log('2. If no profile exists, they\'ll be redirected to profile creation');
      console.log('3. When they create the profile, it should sync to Firestore');
      console.log('\nAlternatively, you can manually create the profile in Firestore Console.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

checkAndFixProfile();
