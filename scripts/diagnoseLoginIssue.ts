/**
 * Diagnostic script to check login status for a user
 * 
 * Usage: npx ts-node scripts/diagnoseLoginIssue.ts shaouxyz@gmail.com
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmail } from '../utils/userManagement';
import { isFirebaseConfigured, getFirebaseAuth } from '../config/firebase.config';
import { logger } from '../utils/logger';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node scripts/diagnoseLoginIssue.ts <email>');
  process.exit(1);
}

async function diagnoseLoginIssue() {
  console.log(`\n🔍 Diagnosing login issue for: ${email}\n`);
  
  // Check Firebase configuration
  console.log('1. Checking Firebase configuration...');
  const firebaseConfigured = isFirebaseConfigured();
  console.log(`   Firebase configured: ${firebaseConfigured ? '✅ Yes' : '❌ No'}`);
  
  if (firebaseConfigured) {
    try {
      const auth = getFirebaseAuth();
      console.log(`   Firebase Auth initialized: ${auth ? '✅ Yes' : '❌ No'}`);
      
      if (auth && auth.currentUser) {
        console.log(`   Current Firebase user: ${auth.currentUser.email}`);
      } else {
        console.log(`   Current Firebase user: None`);
      }
    } catch (error) {
      console.log(`   Error checking Firebase Auth: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Check local storage
  console.log('\n2. Checking local storage...');
  try {
    const localUser = await getUserByEmail(email);
    if (localUser) {
      console.log(`   ✅ User found in local storage`);
      console.log(`      ID: ${localUser.id}`);
      console.log(`      Created: ${localUser.createdAt}`);
      console.log(`      Has password hash: ${localUser.passwordHash ? 'Yes' : 'No'}`);
    } else {
      console.log(`   ❌ User NOT found in local storage`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking local storage: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Check AsyncStorage user data
  console.log('\n3. Checking AsyncStorage user data...');
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      console.log(`   Current user in AsyncStorage: ${user.email}`);
      if (user.email === email) {
        console.log(`   ✅ This email matches the current user`);
      } else {
        console.log(`   ⚠️  Different user is currently logged in`);
      }
    } else {
      console.log(`   No user data in AsyncStorage`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking AsyncStorage: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Check all users
  console.log('\n4. Checking all users in local storage...');
  try {
    const usersData = await AsyncStorage.getItem('users');
    if (usersData) {
      const users = JSON.parse(usersData);
      console.log(`   Total users in local storage: ${users.length}`);
      const matchingUser = users.find((u: any) => u.email === email);
      if (matchingUser) {
        console.log(`   ✅ Found user in users array`);
      } else {
        console.log(`   ❌ User not in users array`);
        console.log(`   Available emails: ${users.map((u: any) => u.email).join(', ')}`);
      }
    } else {
      console.log(`   No users data in AsyncStorage`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking users: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Recommendations
  console.log('\n📋 Recommendations:');
  
  if (!firebaseConfigured) {
    console.log('   ⚠️  Firebase is not configured. Login will use local storage only.');
  }
  
  try {
    const localUser = await getUserByEmail(email);
    if (!localUser) {
      console.log('   ❌ User does not exist in local storage.');
      console.log('   💡 Solution: User needs to sign up first.');
    } else {
      console.log('   ✅ User exists in local storage.');
      console.log('   💡 If login still fails, check:');
      console.log('      - Password is correct');
      console.log('      - Rate limiting is not blocking');
      console.log('      - Firebase account exists (if Firebase is configured)');
    }
  } catch (error) {
    console.log('   ❌ Could not check user status');
  }
  
  console.log('\n');
}

diagnoseLoginIssue().catch((error) => {
  console.error('Error running diagnosis:', error);
  process.exit(1);
});
