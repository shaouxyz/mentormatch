/**
 * Tests for security utility functions
 */

import { sanitizeString, sanitizeTextField, sanitizeEmail, sanitizePhoneNumber } from '../security';

describe('Security Utils', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(sanitizeString('<div>Test</div>')).toBe('Test');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeString('Test<>"\'')).toBe('Test');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('Test\x00\x01\x1F')).toBe('Test');
    });

    it('should normalize multiple spaces to single space', () => {
      expect(sanitizeString('Hello    World')).toBe('Hello World');
      expect(sanitizeString('Test  Multiple   Spaces')).toBe('Test Multiple Spaces');
    });

    it('should preserve single spaces', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('sanitizeTextField', () => {
    it('should preserve spaces in text', () => {
      expect(sanitizeTextField('Software Development')).toBe('Software Development');
      expect(sanitizeTextField('Business Strategy')).toBe('Business Strategy');
      expect(sanitizeTextField('Data Science and Machine Learning')).toBe('Data Science and Machine Learning');
    });

    it('should preserve multiple spaces (for user typing)', () => {
      expect(sanitizeTextField('Hello  World')).toBe('Hello  World');
      expect(sanitizeTextField('Test   Multiple    Spaces')).toBe('Test   Multiple    Spaces');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeTextField('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(sanitizeTextField('<div>Test</div>')).toBe('Test');
    });

    it('should remove dangerous characters but keep apostrophes', () => {
      // Remove < > "
      expect(sanitizeTextField('Test<>\"')).toBe('Test');
      // But keep apostrophes for names like O'Brien
      expect(sanitizeTextField("O'Brien")).toBe("O'Brien");
      expect(sanitizeTextField("It's working")).toBe("It's working");
    });

    it('should remove control characters', () => {
      expect(sanitizeTextField('Test\x00\x01\x1F')).toBe('Test');
    });

    it('should handle empty strings', () => {
      expect(sanitizeTextField('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeTextField(null as any)).toBe('');
      expect(sanitizeTextField(undefined as any)).toBe('');
      expect(sanitizeTextField(123 as any)).toBe('');
    });

    it('should handle real-world expertise examples', () => {
      expect(sanitizeTextField('Software Development')).toBe('Software Development');
      expect(sanitizeTextField('Marketing & Sales')).toBe('Marketing & Sales');
      expect(sanitizeTextField('Product Management')).toBe('Product Management');
      expect(sanitizeTextField('UI/UX Design')).toBe('UI/UX Design');
    });

    it('should handle real-world location examples', () => {
      expect(sanitizeTextField('San Francisco, CA')).toBe('San Francisco, CA');
      expect(sanitizeTextField('New York City')).toBe('New York City');
      expect(sanitizeTextField('London, UK')).toBe('London, UK');
      expect(sanitizeTextField('São Paulo')).toBe('São Paulo');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(sanitizeEmail('User@Example.Com')).toBe('user@example.com');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeEmail('test<>@example.com')).toBe('test@example.com');
    });

    it('should handle empty strings', () => {
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should preserve valid phone characters', () => {
      expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
      expect(sanitizePhoneNumber('555-1234')).toBe('555-1234');
    });

    it('should remove invalid characters', () => {
      expect(sanitizePhoneNumber('555-1234abc')).toBe('555-1234');
      expect(sanitizePhoneNumber('call me: 555-1234')).toBe('555-1234');
    });

    it('should handle empty strings', () => {
      expect(sanitizePhoneNumber('')).toBe('');
    });
  });
});
