/**
 * CASPA member profiles imported from CSV data
 * These profiles can be loaded into the app for testing and demonstration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@/types/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { logger } from '@/utils/logger';

/**
 * CASPA member profiles
 */
export const CASPA_PROFILES: Profile[] = [
  {
    "name": "Danny",
    "expertise": "General",
    "interest": "General",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "danny@caspa.example.com",
    "phoneNumber": "+1000001000"
  },
  {
    "name": "Arthur",
    "expertise": "General",
    "interest": "General",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "arthur@caspa.example.com",
    "phoneNumber": "+1000001001"
  },
  {
    "name": "Stephanie Teng",
    "expertise": "Sales",
    "interest": "Sales",
    "expertiseYears": 12,
    "interestYears": 12,
    "email": "stephanie.teng@caspa.example.com",
    "phoneNumber": "+1000001002"
  },
  {
    "name": "Julie",
    "expertise": "Marketing",
    "interest": "Marketing",
    "expertiseYears": 2,
    "interestYears": 7,
    "email": "julie@caspa.example.com",
    "phoneNumber": "+1000001003"
  },
  {
    "name": "Student",
    "expertise": "Engineering",
    "interest": "Engineering",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "student@caspa.example.com",
    "phoneNumber": "+1000001004"
  },
  {
    "name": "Chunlin Wang",
    "expertise": "Engineering",
    "interest": "Entrepreneurship",
    "expertiseYears": 17,
    "interestYears": 2,
    "email": "chunlin.wang@caspa.example.com",
    "phoneNumber": "+1000001005"
  },
  {
    "name": "Avery",
    "expertise": "Entrepreneurship, sales, marketing, everything",
    "interest": "Entrepreneurship, sales, marketing, everything",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "avery@caspa.example.com",
    "phoneNumber": "+1000001006"
  },
  {
    "name": "Robert Fan",
    "expertise": "Sales & Marketing",
    "interest": "Sales & Marketing",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "robert.fan@caspa.example.com",
    "phoneNumber": "+1000001007"
  },
  {
    "name": "Justin Strong",
    "expertise": "Public Speaking",
    "interest": "Public Speaking",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "justin.strong@caspa.example.com",
    "phoneNumber": "+1000001008"
  },
  {
    "name": "Gerry Wang",
    "expertise": "General",
    "interest": "General",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "gerry.wang@caspa.example.com",
    "phoneNumber": "+1000001009"
  },
  {
    "name": "Haohua Zhou",
    "expertise": "Silicon Engineering",
    "interest": "Etiquette",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "haohua.zhou@caspa.example.com",
    "phoneNumber": "+1000001010"
  },
  {
    "name": "Annie An",
    "expertise": "General",
    "interest": "General",
    "expertiseYears": 7,
    "interestYears": 2,
    "email": "annie.an@caspa.example.com",
    "phoneNumber": "+1000001011"
  },
  {
    "name": "Jimmy Cheng",
    "expertise": "Entrepreneurship",
    "interest": "Entrepreneurship",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "jimmy.cheng@caspa.example.com",
    "phoneNumber": "+1000001012"
  },
  {
    "name": "Ian Wang",
    "expertise": "Engineering",
    "interest": "Engineering",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "ian.wang@caspa.example.com",
    "phoneNumber": "+1000001013"
  },
  {
    "name": "Gary Wang",
    "expertise": "Engineering",
    "interest": "Management",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "gary.wang@caspa.example.com",
    "phoneNumber": "+1000001014"
  },
  {
    "name": "Joseph Lin",
    "expertise": "Engineering",
    "interest": "Engineering",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "joseph.lin@caspa.example.com",
    "phoneNumber": "+1000001015"
  },
  {
    "name": "Iris Song",
    "expertise": "Finance",
    "interest": "Sales",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "iris.song@caspa.example.com",
    "phoneNumber": "+1000001016"
  },
  {
    "name": "James Lei",
    "expertise": "Marketing, Career",
    "interest": "Business Development",
    "expertiseYears": 20,
    "interestYears": 12,
    "email": "james.lei@caspa.example.com",
    "phoneNumber": "+1000001017"
  },
  {
    "name": "Freda Li",
    "expertise": "EDA",
    "interest": "EDA",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "freda.li@caspa.example.com",
    "phoneNumber": "+1000001018"
  },
  {
    "name": "Stephanie Teng 2",
    "expertise": "Sales",
    "interest": "leadership",
    "expertiseYears": 5,
    "interestYears": 12,
    "email": "stephanie.teng.2@caspa.example.com",
    "phoneNumber": "+1000001019"
  },
  {
    "name": "Kathy Tian",
    "expertise": "Sales, Marketing, Product, HR",
    "interest": "HR solution & service",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "kathy.tian@caspa.example.com",
    "phoneNumber": "+1000001020"
  },
  {
    "name": "Julie Zhang",
    "expertise": "corporate finance",
    "interest": "corporate finance",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "julie.zhang@caspa.example.com",
    "phoneNumber": "+1000001021"
  },
  {
    "name": "William Kou",
    "expertise": "Sales, BD, semicon",
    "interest": "Sales, BD, semicon",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "william.kou@caspa.example.com",
    "phoneNumber": "+1000001022"
  },
  {
    "name": "Zhibin Xiao",
    "expertise": "AI, startup",
    "interest": "AI, startup",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "zhibin.xiao@caspa.example.com",
    "phoneNumber": "+1000001023"
  },
  {
    "name": "Avery Lu",
    "expertise": "General",
    "interest": "General",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "avery.lu@caspa.example.com",
    "phoneNumber": "+1000001024"
  },
  {
    "name": "Rainman Rui",
    "expertise": "Marketing",
    "interest": "Management",
    "expertiseYears": 12,
    "interestYears": 12,
    "email": "rainman.rui@caspa.example.com",
    "phoneNumber": "+1000001025"
  },
  {
    "name": "Fangqing Chu",
    "expertise": "Serdes Design",
    "interest": "Invest",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "fangqing.chu@caspa.example.com",
    "phoneNumber": "+1000001026"
  },
  {
    "name": "Song Xue",
    "expertise": "Management, Semi Tech",
    "interest": "Management, Semi Tech",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "song.xue@caspa.example.com",
    "phoneNumber": "+1000001027"
  },
  {
    "name": "Danny Hua",
    "expertise": "Eco development",
    "interest": "R&D",
    "expertiseYears": 12,
    "interestYears": 12,
    "email": "danny.hua@caspa.example.com",
    "phoneNumber": "+1000001028"
  },
  {
    "name": "Simon Tan",
    "expertise": "Simulation",
    "interest": "Simulation",
    "expertiseYears": 5,
    "interestYears": 2,
    "email": "simon.tan@caspa.example.com",
    "phoneNumber": "+1000001029"
  },
  {
    "name": "Stephanie Qiao",
    "expertise": "Marketing",
    "interest": "Semi Conductor",
    "expertiseYears": 7,
    "interestYears": 2,
    "email": "stephanie.qiao@caspa.example.com",
    "phoneNumber": "+1000001030"
  },
  {
    "name": "Xiangyu Zhang",
    "expertise": "AI architecture",
    "interest": "leadership",
    "expertiseYears": 12,
    "interestYears": 2,
    "email": "xiangyu.zhang@caspa.example.com",
    "phoneNumber": "+1000001031"
  },
  {
    "name": "Helen Guan",
    "expertise": "HR",
    "interest": "HR",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "helen.guan@caspa.example.com",
    "phoneNumber": "+1000001032"
  },
  {
    "name": "Tony Xia",
    "expertise": "Semi Conductor",
    "interest": "Semi Conductor",
    "expertiseYears": 20,
    "interestYears": 2,
    "email": "tony.xia@caspa.example.com",
    "phoneNumber": "+1000001033"
  },
  {
    "name": "Steve Jiang",
    "expertise": "Embedded System, Algorithm",
    "interest": "AI application",
    "expertiseYears": 12,
    "interestYears": 2,
    "email": "steve.jiang@caspa.example.com",
    "phoneNumber": "+1000001034"
  }
];

/**
 * Initialize CASPA profiles in AsyncStorage
 * This function loads all CASPA member profiles into the app's profile list
 */
export async function initializeCaspaProfiles(): Promise<void> {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED);
    
    if (initialized === 'true') {
      logger.info('CASPA profiles already initialized');
      return;
    }

    // Get existing profiles
    let allProfiles: Profile[] = [];
    const existingAllProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    if (existingAllProfilesData) {
      try {
        allProfiles = JSON.parse(existingAllProfilesData);
      } catch (error) {
        logger.warn('Failed to parse existing profiles, starting fresh', { error });
        allProfiles = [];
      }
    }

    // Remove any existing CASPA profiles (in case of re-initialization)
    allProfiles = allProfiles.filter(p => !p.email.includes('@caspa.example.com'));

    // Add CASPA profiles
    allProfiles.push(...CASPA_PROFILES);

    // Save updated profiles
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
    await AsyncStorage.setItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED, 'true');

    logger.info('CASPA profiles initialized', { count: CASPA_PROFILES.length });
  } catch (error) {
    logger.error(
      'Error initializing CASPA profiles',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Reset CASPA profiles (useful for development)
 */
export async function resetCaspaProfiles(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CASPA_PROFILES_INITIALIZED);
    
    // Remove CASPA profiles from allProfiles
    const existingAllProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
    if (existingAllProfilesData) {
      let allProfiles: Profile[] = JSON.parse(existingAllProfilesData);
      allProfiles = allProfiles.filter(p => !p.email.includes('@caspa.example.com'));
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
    }

    logger.info('CASPA profiles reset');
  } catch (error) {
    logger.error(
      'Error resetting CASPA profiles',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
