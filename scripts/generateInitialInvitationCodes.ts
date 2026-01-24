/**
 * Generate Initial Invitation Codes
 * 
 * Generates 100 invitation codes and adds them to the inbox for shaouxyz@gmail.com
 * 
 * Run with: npx ts-node scripts/generateInitialInvitationCodes.ts
 */

import { generateMultipleInvitationCodes } from '../services/invitationCodeService';
import { addInvitationCodeToInbox } from '../services/inboxService';
import { logger } from '../utils/logger';

const RECIPIENT_EMAIL = 'shaouxyz@gmail.com';
const CODE_COUNT = 100;

async function generateInitialCodes() {
  try {
    console.log(`Generating ${CODE_COUNT} invitation codes for ${RECIPIENT_EMAIL}...`);
    
    // Generate codes
    const codes = await generateMultipleInvitationCodes(CODE_COUNT, RECIPIENT_EMAIL);
    
    console.log(`✅ Generated ${codes.length} invitation codes`);
    
    // Add each code to inbox
    console.log('Adding codes to inbox...');
    for (const code of codes) {
      await addInvitationCodeToInbox(RECIPIENT_EMAIL, code.code, RECIPIENT_EMAIL);
    }
    
    console.log(`✅ Added ${codes.length} invitation codes to inbox`);
    console.log('\n📋 Invitation Codes:');
    codes.forEach((code, index) => {
      console.log(`${index + 1}. ${code.code}`);
    });
    
    console.log(`\n✅ Successfully generated and added ${CODE_COUNT} invitation codes to ${RECIPIENT_EMAIL}'s inbox!`);
    process.exit(0);
  } catch (error) {
    logger.error('Error generating initial invitation codes', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateInitialCodes();
