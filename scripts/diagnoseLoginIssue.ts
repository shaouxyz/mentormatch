/**
 * Diagnostic script to check login status for a user
 * 
 * Usage: npx ts-node -r tsconfig-paths/register scripts/diagnoseLoginIssue.ts shaouxyz@gmail.com
 * Or: node --loader ts-node/esm scripts/diagnoseLoginIssue.ts shaouxyz@gmail.com
 */

// Note: This script needs to be run in a React Native environment or with proper mocks
// For now, we'll provide a simpler version that can be run with Node.js

import * as fs from 'fs';
import * as path from 'path';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node scripts/diagnoseLoginIssue.ts <email>');
  process.exit(1);
}

async function diagnoseLoginIssue() {
  console.log(`\n🔍 Diagnosing login issue for: ${email}\n`);
  console.log('⚠️  Note: This script checks local storage files directly.');
  console.log('   For full diagnosis, check the app logs when attempting to log in.\n');
  
  // Check Firebase configuration from .env
  console.log('1. Checking Firebase configuration...');
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const hasApiKey = envContent.includes('EXPO_PUBLIC_FIREBASE_API_KEY');
      const hasAuthDomain = envContent.includes('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
      const hasProjectId = envContent.includes('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
      const hasAppId = envContent.includes('EXPO_PUBLIC_FIREBASE_APP_ID');
      
      const allConfigured = hasApiKey && hasAuthDomain && hasProjectId && hasAppId;
      console.log(`   Firebase configured: ${allConfigured ? '✅ Yes' : '❌ No'}`);
      if (!allConfigured) {
        console.log(`   Missing: ${!hasApiKey ? 'API_KEY ' : ''}${!hasAuthDomain ? 'AUTH_DOMAIN ' : ''}${!hasProjectId ? 'PROJECT_ID ' : ''}${!hasAppId ? 'APP_ID' : ''}`);
      }
    } else {
      console.log(`   ❌ .env file not found`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking Firebase config: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Note about AsyncStorage
  console.log('\n2. Local Storage Check:');
  console.log('   ⚠️  AsyncStorage is React Native specific and cannot be checked from Node.js.');
  console.log('   💡 To check local storage:');
  console.log('      - Run the app and check terminal logs');
  console.log('      - Look for: "User authenticated locally" or "User does not exist locally"');
  console.log('      - Check error messages in the app');
  
  // Recommendations
  console.log('\n📋 Common Issues and Solutions:');
  console.log('\n   Issue 1: User does not exist');
  console.log('   Symptoms: Error "User not found" or "Email not found"');
  console.log('   Solution: User needs to sign up first');
  
  console.log('\n   Issue 2: Wrong password');
  console.log('   Symptoms: Error "Incorrect password" or "auth/wrong-password"');
  console.log('   Solution: Use correct password or reset password');
  
  console.log('\n   Issue 3: User exists locally but not in Firebase');
  console.log('   Symptoms: Firebase error "auth/user-not-found" but local auth works');
  console.log('   Solution: App should auto-create Firebase account. If it fails, try signing up again');
  
  console.log('\n   Issue 4: Rate limiting');
  console.log('   Symptoms: Error "Too many login attempts"');
  console.log('   Solution: Wait a few minutes and try again');
  
  console.log('\n   Issue 5: Firebase not configured');
  console.log('   Symptoms: Login works but only uses local storage');
  console.log('   Solution: Configure Firebase in .env file');
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Try logging in and check the terminal/console logs');
  console.log('   2. Look for specific error codes (e.g., auth/user-not-found, auth/wrong-password)');
  console.log('   3. Check if Firebase is initialized (look for "[FIREBASE] Initialization complete")');
  console.log('   4. Share the error message you see for more specific help');
  
  console.log('\n');
}

diagnoseLoginIssue().catch((error) => {
  console.error('Error running diagnosis:', error);
  process.exit(1);
});
