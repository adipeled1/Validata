import { describe, it, expect } from 'vitest';
import { parseCSV } from './csvParser';

describe('parseCSV', () => {
  it('parses a simple header + rows into lowercased-key objects', () => {
    const result = parseCSV('Name,Age\nAlice,30\nBob,25');
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('handles quoted fields containing commas', () => {
    const result = parseCSV('Name,Notes\nAlice,"has, a comma"');
    expect(result).toEqual([{ name: 'Alice', notes: 'has, a comma' }]);
  });

  it('handles an escaped double-quote inside a quoted field', () => {
    const result = parseCSV('Name,Notes\nAlice,"she said ""hi"""');
    expect(result).toEqual([{ name: 'Alice', notes: 'she said "hi"' }]);
  });

  it('handles CRLF line endings without producing a blank row', () => {
    const result = parseCSV('Name,Age\r\nAlice,30\r\nBob,25');
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('fills a missing trailing field with an empty string', () => {
    const result = parseCSV('Name,Age,Notes\nAlice,30');
    expect(result).toEqual([{ name: 'Alice', age: '30', notes: '' }]);
  });

  it('returns [] for a header-only or empty input', () => {
    expect(parseCSV('Name,Age')).toEqual([]);
    expect(parseCSV('')).toEqual([]);
  });
});
