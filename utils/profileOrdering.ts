/**
 * Profile Ordering Utilities
 * 
 * Provides smart ordering of profiles that combines:
 * - Match score prioritization (better matches shown first)
 * - Randomization (different users see different orders)
 * - Weighted randomization (higher match scores have higher probability of appearing first)
 */

import { Profile } from '@/types/types';
import { MATCH_SCORE_EXPERTISE_INTEREST, MATCH_SCORE_INTEREST_EXPERTISE } from './constants';

/**
 * Calculate match score between two profiles
 * Based on expertise-interest overlap
 */
export function calculateMatchScore(profile1: Profile, profile2: Profile): number {
  let score = 0;

  // Check if profile1's expertise matches profile2's interest
  if (
    profile1.expertise.toLowerCase().includes(profile2.interest.toLowerCase()) ||
    profile2.interest.toLowerCase().includes(profile1.expertise.toLowerCase())
  ) {
    score += MATCH_SCORE_EXPERTISE_INTEREST;
  }

  // Check if profile1's interest matches profile2's expertise
  if (
    profile1.interest.toLowerCase().includes(profile2.expertise.toLowerCase()) ||
    profile2.expertise.toLowerCase().includes(profile1.interest.toLowerCase())
  ) {
    score += MATCH_SCORE_INTEREST_EXPERTISE;
  }

  return score;
}

/**
 * Seeded random number generator for consistent randomization per user
 * Uses a simple Linear Congruential Generator (LCG)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Generate a seed from a string (e.g., user email)
 */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Weighted shuffle algorithm
 * Items with higher weights have higher probability of appearing first
 * Uses Fisher-Yates shuffle with weighted selection
 */
function weightedShuffle<T>(
  items: T[],
  weights: number[],
  random: () => number
): T[] {
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have the same length');
  }

  const result: T[] = [];
  const remaining = items.map((item, index) => ({ item, weight: weights[index] }));

  while (remaining.length > 0) {
    // Calculate total weight
    const totalWeight = remaining.reduce((sum, { weight }) => sum + weight, 0);

    // Select random weighted index
    let randomValue = random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      randomValue -= remaining[i].weight;
      if (randomValue <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Add selected item to result and remove from remaining
    result.push(remaining[selectedIndex].item);
    remaining.splice(selectedIndex, 1);
  }

  return result;
}

/**
 * Order profiles with smart randomization
 * 
 * Features:
 * - Consistent randomization per user (same user sees same order)
 * - Better matches appear earlier (weighted by match score)
 * - Different users see different orders
 * - Profiles with match score >= 50 get 3x weight
 * - Profiles with match score 25-49 get 2x weight
 * - Profiles with match score < 25 get 1x weight
 * 
 * @param profiles - Array of profiles to order
 * @param currentUserProfile - Current user's profile for match calculation
 * @param userSeed - Seed for randomization (e.g., user email)
 * @returns Ordered array of profiles
 */
export function orderProfilesSmartly(
  profiles: Profile[],
  currentUserProfile: Profile | null,
  userSeed: string
): Profile[] {
  if (profiles.length === 0) {
    return [];
  }

  if (!currentUserProfile) {
    // If no current user profile, just randomize
    const seed = stringToSeed(userSeed);
    const random = seededRandom(seed);
    const shuffled = [...profiles];
    
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  // Calculate match scores and weights
  const profilesWithScores = profiles.map((profile) => {
    const matchScore = calculateMatchScore(currentUserProfile, profile);
    
    // Assign weight based on match score
    let weight = 1;
    if (matchScore >= 50) {
      weight = 3; // High match - 3x more likely to appear first
    } else if (matchScore >= 25) {
      weight = 2; // Medium match - 2x more likely to appear first
    }
    
    return { profile, matchScore, weight };
  });

  // Create seeded random generator
  const seed = stringToSeed(userSeed);
  const random = seededRandom(seed);

  // Extract profiles and weights
  const profileArray = profilesWithScores.map((p) => p.profile);
  const weights = profilesWithScores.map((p) => p.weight);

  // Perform weighted shuffle
  return weightedShuffle(profileArray, weights, random);
}

/**
 * Order profiles for display (convenience function)
 * Uses user email as seed for consistent randomization
 */
export function orderProfilesForUser(
  profiles: Profile[],
  currentUserProfile: Profile | null
): Profile[] {
  const userSeed = currentUserProfile?.email || 'anonymous';
  return orderProfilesSmartly(profiles, currentUserProfile, userSeed);
}
