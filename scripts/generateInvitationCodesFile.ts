/**
 * Generate 100 Invitation Codes and Save to File
 * 
 * This script generates 100 invitation codes and saves them to a text file.
 * 
 * Usage: npx ts-node scripts/generateInvitationCodesFile.ts
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate a random invitation code
 * Uses the same logic as invitationCodeService
 */
function generateInvitationCode(): string {
  // Generate a 8-character alphanumeric code
  // Exclude confusing chars (0, O, I, 1) - same as service
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate multiple unique invitation codes
 */
function generateInvitationCodes(count: number): string[] {
  const codes = new Set<string>();
  
  while (codes.size < count) {
    const code = generateInvitationCode();
    codes.add(code);
  }
  
  return Array.from(codes);
}

/**
 * Main function
 */
async function main() {
  const count = 100;
  const codes = generateInvitationCodes(count);
  
  // Create output file path
  const outputPath = path.join(process.cwd(), 'invitation_codes.txt');
  
  // Format codes for file output
  const fileContent = codes.map((code, index) => {
    return `${index + 1}. ${code}`;
  }).join('\n');
  
  // Add header
  const header = `Invitation Codes\nGenerated: ${new Date().toISOString()}\nTotal: ${count}\n\n`;
  const fullContent = header + fileContent;
  
  // Write to file
  fs.writeFileSync(outputPath, fullContent, 'utf8');
  
  console.log(`\n✅ Generated ${count} invitation codes`);
  console.log(`📄 Saved to: ${outputPath}\n`);
  console.log('First 10 codes:');
  codes.slice(0, 10).forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`);
  });
  console.log(`\n... and ${count - 10} more codes in the file.\n`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
