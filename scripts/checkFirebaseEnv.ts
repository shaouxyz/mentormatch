/**
 * Check Firebase Environment Variables
 * 
 * This script checks if Firebase environment variables are properly configured.
 * Run with: npx ts-node scripts/checkFirebaseEnv.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✓ Loaded .env file');
} else {
  console.log('⚠ .env file not found');
}

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

console.log('\n=== Firebase Environment Variables Check ===\n');

let allConfigured = true;
const results: { name: string; configured: boolean; value: string }[] = [];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isConfigured = value && 
    value !== `YOUR_${varName.replace('EXPO_PUBLIC_FIREBASE_', '')}` &&
    !value.includes('your_') &&
    !value.includes('YOUR_') &&
    value.length > 5;

  results.push({
    name: varName,
    configured: isConfigured,
    value: isConfigured ? `${value?.substring(0, 10)}...` : (value || 'NOT SET'),
  });

  if (!isConfigured) {
    allConfigured = false;
  }

  const status = isConfigured ? '✓' : '✗';
  console.log(`${status} ${varName}: ${isConfigured ? 'Configured' : 'NOT CONFIGURED'}`);
  if (!isConfigured) {
    console.log(`  Current value: ${value || 'NOT SET'}`);
  }
});

console.log('\n=== Summary ===\n');

if (allConfigured) {
  console.log('✓ All Firebase environment variables are configured!');
  console.log('\nTo verify in EAS build:');
  console.log('  1. Check eas.json for env variables');
  console.log('  2. Or use: eas secret:list');
} else {
  console.log('✗ Some Firebase environment variables are missing or not configured.');
  console.log('\nNext steps:');
  console.log('  1. Create a .env file (copy from env.example)');
  console.log('  2. Fill in your Firebase config values');
  console.log('  3. For EAS builds, either:');
  console.log('     a. Add to eas.json env section, OR');
  console.log('     b. Use EAS secrets: eas secret:create --scope project --name <VAR_NAME> --value <VALUE>');
}

console.log('\n=== Current Values (first 10 chars) ===\n');
results.forEach((result) => {
  console.log(`${result.name}: ${result.value}`);
});
