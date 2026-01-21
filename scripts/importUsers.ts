/**
 * Script to import users from CSV data into the app
 * This creates profile data that can be loaded into AsyncStorage
 */

interface CSVUser {
  name: string;
  role: string;
  expertiseYears: string;
  expertise: string;
  interestYears: string;
  interest: string;
  hoursPerMonth: string;
  phone: string;
  email: string;
  mentor: string;
  mentee: string;
  familyOf: string;
  note: string;
}

interface Profile {
  id: string;
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
  role?: string;
  hoursPerMonth?: number;
}

/**
 * Parse years string to number
 */
function parseYears(yearsStr: string): number {
  if (!yearsStr || yearsStr === 'N/A') return 0;
  
  if (yearsStr.includes('20+')) return 20;
  
  const match = yearsStr.match(/(\d+)-(\d+)/);
  if (match) {
    const [_, min, max] = match;
    return Math.floor((parseInt(min) + parseInt(max)) / 2);
  }
  
  const single = parseInt(yearsStr);
  if (!isNaN(single)) return single;
  
  return 0;
}

/**
 * Generate email from name if not provided
 */
function generateEmail(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '.') + '@caspa.example.com';
}

/**
 * Generate phone number (placeholder)
 */
function generatePhone(index: number): string {
  return `+1${String(index).padStart(9, '0')}`;
}

/**
 * Parse CSV row data
 */
const csvData: CSVUser[] = [
  { name: "Danny", role: "BOA", expertiseYears: "20+", expertise: "", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Arthur", role: "Family & Friend", expertiseYears: "N/A", expertise: "", interestYears: "0-4", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "Chunlin Wang", note: "" },
  { name: "Stephanie Teng", role: "BOD", expertiseYears: "10-14", expertise: "Sales", interestYears: "10-14", interest: "Sales", hoursPerMonth: "10", phone: "", email: "", mentor: "Robert Fan", mentee: "Julie", familyOf: "", note: "" },
  { name: "Julie", role: "BOV", expertiseYears: "0-4", expertise: "Marketing", interestYears: "5-9", interest: "Marketing", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Student", role: "Family & Friend", expertiseYears: "N/A", expertise: "", interestYears: "0-4", interest: "Engineering", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Chunlin Wang", role: "BOD", expertiseYears: "15-19", expertise: "Engineering", interestYears: "0-4", interest: "Entrepreneurship", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Avery", role: "BOD", expertiseYears: "20+", expertise: "Entrepreneurship, sales, marketing, everything", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Robert Fan", role: "Speaker & Advisor", expertiseYears: "20+", expertise: "Sales & Marketing", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "Stephanie Teng", familyOf: "", note: "" },
  { name: "Justin Strong", role: "Speaker & Advisor", expertiseYears: "20+", expertise: "Public Speaking", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "Gerry Wang", familyOf: "", note: "" },
  { name: "Gerry Wang", role: "BOD", expertiseYears: "", expertise: "", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Haohua Zhou", role: "BOA", expertiseYears: "20+", expertise: "Silicon Engineering", interestYears: "N/A", interest: "Etiquette", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Annie An", role: "BOD", expertiseYears: "5-9", expertise: "", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Jimmy Cheng", role: "VP", expertiseYears: "20+", expertise: "Entrepreneurship", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Ian Wang", role: "BOD", expertiseYears: "20+", expertise: "Engineering", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Gary Wang", role: "President", expertiseYears: "20+", expertise: "Engineering", interestYears: "N/A", interest: "Management", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Joseph Lin", role: "BOA", expertiseYears: "20+", expertise: "Engineering", interestYears: "N/A", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Iris Song", role: "BOD", expertiseYears: "20+", expertise: "Finance", interestYears: "N/A", interest: "Sales", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "James Lei", role: "Ex-President", expertiseYears: "20+", expertise: "Marketing, Career", interestYears: "10-14", interest: "Business Development", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Freda Li", role: "BOV", expertiseYears: "", expertise: "", interestYears: "0-4", interest: "EDA", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Stephanie Teng 2", role: "BOD", expertiseYears: "", expertise: "Sales", interestYears: "10-14", interest: "leadership", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Kathy Tian", role: "BOD", expertiseYears: "", expertise: "Sales, Marketing, Product, HR", interestYears: "", interest: "HR solution & service", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Julie Zhang", role: "BOV", expertiseYears: "", expertise: "", interestYears: "0-4", interest: "corporate finance", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "William Kou", role: "BOV", expertiseYears: "", expertise: "Sales, BD, semicon", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Zhibin Xiao", role: "BOA", expertiseYears: "", expertise: "AI, startup", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Avery Lu", role: "BOD", expertiseYears: "", expertise: "", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Rainman Rui", role: "BOV", expertiseYears: "10-14", expertise: "Marketing", interestYears: "10-14", interest: "Management", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Fangqing Chu", role: "BOD", expertiseYears: "20+", expertise: "Serdes Design", interestYears: "0-4", interest: "Invest", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Song Xue", role: "BOA", expertiseYears: "20+", expertise: "Management, Semi Tech", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Danny Hua", role: "Ex-President", expertiseYears: "10-14", expertise: "Eco development", interestYears: "10-14", interest: "R&D", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Simon Tan", role: "BOV", expertiseYears: "", expertise: "Simulation", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Stephanie Qiao", role: "BOV", expertiseYears: "5-9", expertise: "Marketing", interestYears: "", interest: "Semi Conductor", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Xiangyu Zhang", role: "BOD", expertiseYears: "10-14", expertise: "AI architecture", interestYears: "0-4", interest: "leadership", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Helen Guan", role: "BOD", expertiseYears: "20+", expertise: "HR", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Tony Xia", role: "BOA", expertiseYears: "20+", expertise: "Semi Conductor", interestYears: "", interest: "", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
  { name: "Steve Jiang", role: "BOD", expertiseYears: "10-14", expertise: "Embedded System, Algorithm", interestYears: "", interest: "AI application", hoursPerMonth: "", phone: "", email: "", mentor: "", mentee: "", familyOf: "", note: "" },
];

/**
 * Convert CSV data to Profile objects
 */
function convertToProfiles(): Profile[] {
  return csvData.map((user, index) => {
    const expertiseYears = parseYears(user.expertiseYears);
    const interestYears = parseYears(user.interestYears);
    const expertise = user.expertise || user.interest || 'General';
    const interest = user.interest || user.expertise || 'General';
    
    return {
      id: `caspa_${index + 1}`,
      name: user.name,
      expertise: expertise,
      interest: interest,
      expertiseYears: expertiseYears > 0 ? expertiseYears : 5, // Default to 5 if not specified
      interestYears: interestYears > 0 ? interestYears : 2, // Default to 2 if not specified
      email: user.email || generateEmail(user.name),
      phoneNumber: user.phone || generatePhone(index + 1000),
      role: user.role,
      hoursPerMonth: user.hoursPerMonth ? parseInt(user.hoursPerMonth) : undefined,
    };
  });
}

/**
 * Main function to generate profiles
 */
function main() {
  const profiles = convertToProfiles();
  
  console.log('// Generated Profiles for Import');
  console.log('// Copy this JSON array to your app initialization');
  console.log('');
  console.log(JSON.stringify(profiles, null, 2));
  console.log('');
  console.log(`// Total profiles: ${profiles.length}`);
}

main();
