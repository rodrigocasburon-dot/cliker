import { describe, expect, it } from 'vitest';
import { D } from '../src/core/decimal';
import { formatDuration, formatNumber } from '../src/core/format';

describe('formato', () => {
  it('abrevia con sufijos', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1234)).toBe('1.23K');
    expect(formatNumber(4.5e6)).toBe('4.5M');
    expect(formatNumber(12.3e9)).toBe('12.3B');
  });
  it('usa notación científica en cifras enormes', () => {
    expect(formatNumber(D('1.5e100'))).toBe('1.5e100');
    expect(formatNumber(1234, 'scientific')).toBe('1.23e3');
  });
  it('duraciones', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(200)).toBe('3 min 20 s');
    expect(formatDuration(7500)).toBe('2 h 5 min');
  });
});
