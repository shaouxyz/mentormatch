/**
 * Tests for validation utility functions
 */

import { validateProfile, validateEmail, validatePassword } from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('user.name@example.com').isValid).toBe(true);
      expect(validateEmail('user+tag@example.co.uk').isValid).toBe(true);
      expect(validateEmail('user_name@example-domain.com').isValid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid').isValid).toBe(false);
      expect(validateEmail('invalid@').isValid).toBe(false);
      expect(validateEmail('@example.com').isValid).toBe(false);
      expect(validateEmail('test@').isValid).toBe(false);
      expect(validateEmail('').isValid).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.co').isValid).toBe(true); // Minimal valid email (TLD must be 2+ chars)
      expect(validateEmail('a@b.c').isValid).toBe(false); // TLD too short
      expect(validateEmail('test..test@example.com').isValid).toBe(false); // Double dot is invalid
      expect(validateEmail('test @example.com').isValid).toBe(false); // Space in email
    });

    it('should return error message for invalid emails', () => {
      const result = validateEmail('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords meeting minimum length', () => {
      expect(validatePassword('123456').isValid).toBe(true);
      expect(validatePassword('password123').isValid).toBe(true);
      expect(validatePassword('abcdefghijklmnop').isValid).toBe(true);
    });

    it('should reject passwords below minimum length', () => {
      expect(validatePassword('12345').isValid).toBe(false);
      expect(validatePassword('abc').isValid).toBe(false);
      expect(validatePassword('1').isValid).toBe(false);
      expect(validatePassword('').isValid).toBe(false);
    });

    it('should handle special characters', () => {
      expect(validatePassword('pass@123').isValid).toBe(true);
      expect(validatePassword('P@ssw0rd!').isValid).toBe(true);
      expect(validatePassword('!@#$%^').isValid).toBe(true);
    });

    it('should validate password confirmation', () => {
      expect(validatePassword('password123', 'password123').isValid).toBe(true);
      expect(validatePassword('password123', 'different').isValid).toBe(false);
    });

    it('should return error message for short passwords', () => {
      const result = validatePassword('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6 characters');
    });
  });


  describe('validateProfile', () => {
    const validProfile = {
      name: 'John Doe',
      expertise: 'Software Development',
      interest: 'Machine Learning',
      expertiseYears: '5',
      interestYears: '2',
      email: 'john@example.com',
      phoneNumber: '555-1234',
    };

    it('should validate complete valid profile', () => {
      const result = validateProfile(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty name', () => {
      const profile = { ...validProfile, name: '' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject empty expertise', () => {
      const profile = { ...validProfile, expertise: '' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expertise');
    });

    it('should reject empty interest', () => {
      const profile = { ...validProfile, interest: '' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('interest');
    });

    it('should reject invalid email', () => {
      const profile = { ...validProfile, email: 'invalid-email' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject invalid phone number', () => {
      const profile = { ...validProfile, phoneNumber: 'abc123' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('phone');
    });

    it('should reject negative expertise years', () => {
      const profile = { ...validProfile, expertiseYears: '-1' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expertise');
    });

    it('should reject negative interest years', () => {
      const profile = { ...validProfile, interestYears: '-1' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('interest');
    });

    it('should reject non-numeric expertise years', () => {
      const profile = { ...validProfile, expertiseYears: 'abc' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expertise');
    });

    it('should reject non-numeric interest years', () => {
      const profile = { ...validProfile, interestYears: 'xyz' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('interest');
    });

    it('should accept zero years', () => {
      const profile = { ...validProfile, expertiseYears: '0', interestYears: '0' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should reject years exceeding maximum', () => {
      const profile = { ...validProfile, expertiseYears: '101' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100');
    });

    it('should handle profile with location', () => {
      const profile = { ...validProfile, location: 'San Francisco, CA' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should handle profile without location (optional)', () => {
      const profile = { ...validProfile, location: '' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should handle whitespace-only fields as empty', () => {
      const profile = { ...validProfile, name: '   ' };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
    });

    it('should validate name length', () => {
      const longName = 'a'.repeat(101);
      const profile = { ...validProfile, name: longName };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100');
    });

    it('should validate expertise length', () => {
      const longExpertise = 'a'.repeat(201);
      const profile = { ...validProfile, expertise: longExpertise };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('200');
    });

    it('should validate interest length', () => {
      const longInterest = 'a'.repeat(201);
      const profile = { ...validProfile, interest: longInterest };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('200');
    });
  });
});
