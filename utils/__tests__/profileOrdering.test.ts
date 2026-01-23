/**
 * Tests for Profile Ordering Utilities
 */

import { Profile } from '../../types/types';
import {
  calculateMatchScore,
  orderProfilesSmartly,
  orderProfilesForUser,
} from '../profileOrdering';
import { MATCH_SCORE_EXPERTISE_INTEREST, MATCH_SCORE_INTEREST_EXPERTISE } from '../constants';

describe('Profile Ordering Utils', () => {
  const mockCurrentProfile: Profile = {
    name: 'Current User',
    expertise: 'Software Development',
    interest: 'Machine Learning',
    expertiseYears: 5,
    interestYears: 2,
    email: 'current@example.com',
    phoneNumber: '555-0000',
  };

  const mockProfile1: Profile = {
    name: 'Profile 1',
    expertise: 'Machine Learning', // Matches current user's interest
    interest: 'Software Development', // Matches current user's expertise
    expertiseYears: 7,
    interestYears: 3,
    email: 'profile1@example.com',
    phoneNumber: '555-0001',
  };

  const mockProfile2: Profile = {
    name: 'Profile 2',
    expertise: 'Machine Learning', // Matches current user's interest
    interest: 'Data Science', // No match
    expertiseYears: 4,
    interestYears: 2,
    email: 'profile2@example.com',
    phoneNumber: '555-0002',
  };

  const mockProfile3: Profile = {
    name: 'Profile 3',
    expertise: 'Design', // No match
    interest: 'Software Development', // Matches current user's expertise
    expertiseYears: 3,
    interestYears: 1,
    email: 'profile3@example.com',
    phoneNumber: '555-0003',
  };

  const mockProfile4: Profile = {
    name: 'Profile 4',
    expertise: 'Marketing', // No match
    interest: 'Sales', // No match
    expertiseYears: 6,
    interestYears: 4,
    email: 'profile4@example.com',
    phoneNumber: '555-0004',
  };

  describe('calculateMatchScore', () => {
    it('should return maximum score for perfect bidirectional match', () => {
      const score = calculateMatchScore(mockCurrentProfile, mockProfile1);
      expect(score).toBe(
        MATCH_SCORE_EXPERTISE_INTEREST + MATCH_SCORE_INTEREST_EXPERTISE
      );
    });

    it('should return partial score for expertise-interest match only', () => {
      const score = calculateMatchScore(mockCurrentProfile, mockProfile2);
      expect(score).toBe(MATCH_SCORE_INTEREST_EXPERTISE);
    });

    it('should return partial score for interest-expertise match only', () => {
      const score = calculateMatchScore(mockCurrentProfile, mockProfile3);
      expect(score).toBe(MATCH_SCORE_EXPERTISE_INTEREST);
    });

    it('should return zero for no match', () => {
      const score = calculateMatchScore(mockCurrentProfile, mockProfile4);
      expect(score).toBe(0);
    });

    it('should be case insensitive', () => {
      const profile = {
        ...mockProfile1,
        expertise: 'MACHINE LEARNING',
        interest: 'SOFTWARE DEVELOPMENT',
      };
      const score = calculateMatchScore(mockCurrentProfile, profile);
      expect(score).toBe(
        MATCH_SCORE_EXPERTISE_INTEREST + MATCH_SCORE_INTEREST_EXPERTISE
      );
    });

    it('should match partial strings', () => {
      const profile: Profile = {
        name: 'Test',
        expertise: 'Advanced Machine Learning', // Contains "Machine Learning"
        interest: 'Software', // Contained in "Software Development"
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-9999',
      };
      const score = calculateMatchScore(mockCurrentProfile, profile);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('orderProfilesSmartly', () => {
    it('should return empty array for empty input', () => {
      const result = orderProfilesSmartly([], mockCurrentProfile, 'seed123');
      expect(result).toEqual([]);
    });

    it('should return profiles in consistent order for same seed', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result1 = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      const result2 = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      
      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(4);
    });

    it('should return different orders for different seeds', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result1 = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      const result2 = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed456');
      
      // Orders should be different (with very high probability)
      expect(result1).not.toEqual(result2);
    });

    it('should prioritize high match profiles', () => {
      const profiles = [mockProfile4, mockProfile3, mockProfile2, mockProfile1];
      const result = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      
      // Profile1 has highest match score, should appear early
      const profile1Index = result.findIndex((p) => p.email === mockProfile1.email);
      const profile4Index = result.findIndex((p) => p.email === mockProfile4.email);
      
      // Profile1 (high match) should generally appear before Profile4 (no match)
      // Run multiple times to verify probabilistic behavior
      let profile1FirstCount = 0;
      for (let i = 0; i < 10; i++) {
        const testResult = orderProfilesSmartly(
          profiles,
          mockCurrentProfile,
          `seed${i}`
        );
        const idx1 = testResult.findIndex((p) => p.email === mockProfile1.email);
        const idx4 = testResult.findIndex((p) => p.email === mockProfile4.email);
        if (idx1 < idx4) profile1FirstCount++;
      }
      
      // High match should appear first in majority of cases (>= 7 out of 10)
      expect(profile1FirstCount).toBeGreaterThanOrEqual(7);
    });

    it('should randomize when no current profile provided', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result1 = orderProfilesSmartly(profiles, null, 'seed123');
      const result2 = orderProfilesSmartly(profiles, null, 'seed456');
      
      expect(result1).toHaveLength(4);
      expect(result2).toHaveLength(4);
      // Different seeds should produce different orders
      expect(result1).not.toEqual(result2);
    });

    it('should maintain all profiles in result', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      
      expect(result).toHaveLength(profiles.length);
      profiles.forEach((profile) => {
        expect(result).toContainEqual(profile);
      });
    });

    it('should handle single profile', () => {
      const profiles = [mockProfile1];
      const result = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      
      expect(result).toEqual([mockProfile1]);
    });

    it('should handle two profiles', () => {
      const profiles = [mockProfile1, mockProfile4];
      const result = orderProfilesSmartly(profiles, mockCurrentProfile, 'seed123');
      
      expect(result).toHaveLength(2);
      expect(result).toContain(mockProfile1);
      expect(result).toContain(mockProfile4);
    });
  });

  describe('orderProfilesForUser', () => {
    it('should use user email as seed', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result1 = orderProfilesForUser(profiles, mockCurrentProfile);
      const result2 = orderProfilesForUser(profiles, mockCurrentProfile);
      
      // Same user should see same order
      expect(result1).toEqual(result2);
    });

    it('should produce different orders for different users', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      
      const user1Profile = { ...mockCurrentProfile, email: 'user1@example.com' };
      const user2Profile = { ...mockCurrentProfile, email: 'user2@example.com' };
      
      const result1 = orderProfilesForUser(profiles, user1Profile);
      const result2 = orderProfilesForUser(profiles, user2Profile);
      
      // Different users should see different orders (with high probability)
      expect(result1).not.toEqual(result2);
    });

    it('should handle null current profile', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      const result = orderProfilesForUser(profiles, null);
      
      expect(result).toHaveLength(4);
      profiles.forEach((profile) => {
        expect(result).toContainEqual(profile);
      });
    });

    it('should be deterministic for same user', () => {
      const profiles = [mockProfile1, mockProfile2, mockProfile3, mockProfile4];
      
      // Call multiple times with same user
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(orderProfilesForUser(profiles, mockCurrentProfile));
      }
      
      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('Match Score Weighting', () => {
    it('should give higher weight to profiles with score >= 50', () => {
      // Create profiles with known match scores
      const highMatchProfile = mockProfile1; // Score = 75 (both directions match)
      const lowMatchProfile = mockProfile4; // Score = 0 (no match)
      
      const profiles = [lowMatchProfile, highMatchProfile];
      
      // Run multiple times and count how often high match appears first
      let highMatchFirstCount = 0;
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        const result = orderProfilesSmartly(
          profiles,
          mockCurrentProfile,
          `seed${i}`
        );
        if (result[0].email === highMatchProfile.email) {
          highMatchFirstCount++;
        }
      }
      
      // High match should appear first in majority of cases (>= 30 out of 50)
      // With 3x weight vs 1x weight, high match has 75% probability
      expect(highMatchFirstCount).toBeGreaterThanOrEqual(30);
    });

    it('should give medium weight to profiles with score 25-49', () => {
      // Profile2 has score = 25 (one direction match)
      // Profile4 has score = 0 (no match)
      const profiles = [mockProfile4, mockProfile2];
      
      let mediumMatchFirstCount = 0;
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        const result = orderProfilesSmartly(
          profiles,
          mockCurrentProfile,
          `seed${i}`
        );
        if (result[0].email === mockProfile2.email) {
          mediumMatchFirstCount++;
        }
      }
      
      // Medium match should appear first more often than no match (>= 27 out of 50)
      // With 2x weight vs 1x weight, medium match has 67% probability
      expect(mediumMatchFirstCount).toBeGreaterThanOrEqual(27);
    });
  });

  describe('Edge Cases', () => {
    it('should handle profiles with missing optional fields', () => {
      const profile: Profile = {
        name: 'Test',
        expertise: 'Software',
        interest: 'Design',
        expertiseYears: 5,
        interestYears: 2,
        email: 'test@example.com',
        phoneNumber: '555-1111',
        // location is optional
      };
      
      const profiles = [profile, mockProfile1];
      const result = orderProfilesForUser(profiles, mockCurrentProfile);
      
      expect(result).toHaveLength(2);
    });

    it('should handle very long profile lists', () => {
      const profiles: Profile[] = [];
      for (let i = 0; i < 100; i++) {
        profiles.push({
          name: `Profile ${i}`,
          expertise: i % 2 === 0 ? 'Machine Learning' : 'Design',
          interest: i % 2 === 0 ? 'Software Development' : 'Marketing',
          expertiseYears: i,
          interestYears: i,
          email: `profile${i}@example.com`,
          phoneNumber: `555-${i.toString().padStart(4, '0')}`,
        });
      }
      
      const result = orderProfilesForUser(profiles, mockCurrentProfile);
      
      expect(result).toHaveLength(100);
      // Verify all profiles are present
      profiles.forEach((profile) => {
        expect(result.find((p) => p.email === profile.email)).toBeTruthy();
      });
    });

    it('should handle special characters in user seed', () => {
      const profiles = [mockProfile1, mockProfile2];
      const specialProfile = {
        ...mockCurrentProfile,
        email: 'user+test@example.com',
      };
      
      const result = orderProfilesForUser(profiles, specialProfile);
      
      expect(result).toHaveLength(2);
    });
  });
});
