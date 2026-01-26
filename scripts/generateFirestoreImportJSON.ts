/**
 * Generate JSON file for Firebase Console Import
 * 
 * This script reads codes from invitation_codes.txt and creates a JSON file
 * that can be imported into Firestore via Firebase Console.
 * 
 * Usage: npx ts-node scripts/generateFirestoreImportJSON.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const CREATED_BY_EMAIL = 'shaouxyz@gmail.com';

function generateFirestoreImportJSON() {
  try {
    // Read codes from file
    const codesFilePath = path.join(process.cwd(), 'invitation_codes.txt');
    if (!fs.existsSync(codesFilePath)) {
      console.error('❌ Error: invitation_codes.txt not found!');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(codesFilePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Extract codes
    const codes: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Invitation') || trimmed.startsWith('Generated') || trimmed.startsWith('Total')) {
        continue;
      }
      
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

    // Generate Firestore import format
    // Format: Array of objects with document data
    const firestoreData = codes.map((code) => ({
      code,
      createdBy: CREATED_BY_EMAIL,
      isUsed: false,
      createdAt: new Date().toISOString(),
    }));

    // Save to JSON file
    const outputPath = path.join(process.cwd(), 'invitation_codes_firestore.json');
    fs.writeFileSync(outputPath, JSON.stringify(firestoreData, null, 2), 'utf8');

    console.log(`\n✅ Generated Firestore import file: ${outputPath}`);
    console.log(`📋 Contains ${codes.length} invitation codes\n`);
    console.log('📝 Next steps:');
    console.log('   1. Go to Firebase Console > Firestore Database');
    console.log('   2. Click "Start collection" (if invitationCodes doesn\'t exist)');
    console.log('   3. Collection ID: invitationCodes');
    console.log('   4. Use Firebase CLI to import:');
    console.log(`      firebase firestore:import invitation_codes_firestore.json --collection invitationCodes`);
    console.log('\n   OR manually add documents using the JSON structure.\n');
    
    // Also create a simpler format for manual copy-paste
    const simpleFormat = codes.map((code, index) => 
      `${index + 1}. ${code}`
    ).join('\n');
    
    const simplePath = path.join(process.cwd(), 'invitation_codes_list.txt');
    fs.writeFileSync(simplePath, simpleFormat, 'utf8');
    console.log(`📄 Also created simple list: ${simplePath}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

generateFirestoreImportJSON();
