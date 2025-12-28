import { describe, it, expect } from 'vitest';
import {
  inferColumnType,
  isEmail,
  isUUID,
  isISODate,
  isInteger,
  isFloat,
  isBoolean,
} from '../../src/services/type-inference.js';

describe('Type Detection Utilities', () => {
  describe('isEmail', () => {
    it('should detect valid emails', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isEmail('not-an-email')).toBe(false);
      expect(isEmail('@missing-local.com')).toBe(false);
      expect(isEmail('missing@.com')).toBe(false);
    });
  });

  describe('isUUID', () => {
    it('should detect valid UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('isISODate', () => {
    it('should detect valid ISO dates', () => {
      expect(isISODate('2024-01-15')).toBe(true);
      expect(isISODate('2023-12-31')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isISODate('01/15/2024')).toBe(false);
      expect(isISODate('2024-13-01')).toBe(false); // Invalid month
      expect(isISODate('not-a-date')).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should detect integers', () => {
      expect(isInteger('42')).toBe(true);
      expect(isInteger('-100')).toBe(true);
      expect(isInteger('0')).toBe(true);
    });

    it('should reject non-integers', () => {
      expect(isInteger('3.14')).toBe(false);
      expect(isInteger('abc')).toBe(false);
      expect(isInteger('1.0')).toBe(false);
    });
  });

  describe('isFloat', () => {
    it('should detect floats', () => {
      expect(isFloat('3.14')).toBe(true);
      expect(isFloat('-0.5')).toBe(true);
      expect(isFloat('100.00')).toBe(true);
      expect(isFloat('42')).toBe(true); // Integers are valid floats
    });

    it('should reject non-floats', () => {
      expect(isFloat('abc')).toBe(false);
      expect(isFloat('1.2.3')).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should detect boolean values', () => {
      expect(isBoolean('true')).toBe(true);
      expect(isBoolean('false')).toBe(true);
      expect(isBoolean('TRUE')).toBe(true);
      expect(isBoolean('1')).toBe(true);
      expect(isBoolean('0')).toBe(true);
      expect(isBoolean('yes')).toBe(true);
      expect(isBoolean('no')).toBe(true);
    });

    it('should reject non-booleans', () => {
      expect(isBoolean('maybe')).toBe(false);
      expect(isBoolean('2')).toBe(false);
    });
  });
});

describe('inferColumnType', () => {
  it('should infer email type with high confidence', () => {
    const samples = [
      'john@example.com',
      'jane@test.org',
      'bob@company.io',
      'alice@domain.com',
    ];
    const result = inferColumnType(samples);
    
    expect(result.inferredType).toBe('email');
    expect(result.confidence).toBe(1);
    expect(result.nullable).toBe(false);
  });

  it('should infer integer type', () => {
    const samples = ['1', '2', '3', '42', '100'];
    const result = inferColumnType(samples);
    
    expect(result.inferredType).toBe('integer');
    expect(result.confidence).toBe(1);
  });

  it('should promote to float when mixed integers and floats', () => {
    const samples = ['1', '2.5', '3', '4.0', '5'];
    const result = inferColumnType(samples);
    
    expect(result.inferredType).toBe('float');
  });

  it('should handle nullable columns', () => {
    const samples = ['value1', '', 'value2', null, 'value3'];
    const result = inferColumnType(samples);
    
    expect(result.nullable).toBe(true);
    expect(result.nullCount).toBe(2);
  });

  it('should fallback to string for mixed types', () => {
    const samples = ['hello', '42', 'true', '2024-01-01'];
    const result = inferColumnType(samples);
    
    expect(result.inferredType).toBe('string');
  });

  it('should calculate unique ratio correctly', () => {
    const samples = ['a', 'a', 'b', 'b', 'c'];
    const result = inferColumnType(samples);
    
    expect(result.uniqueRatio).toBe(0.6); // 3 unique out of 5
  });
});
