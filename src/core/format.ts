import { Decimal, D, type DecimalSource } from './decimal';

export type Notation = 'standard' | 'scientific' | 'engineering';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
  'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

function trim(n: number, digits: number): string {
  // 3 cifras significativas: 1.23K, 12.3K, 123K
  const s = n.toFixed(digits);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

function mantissaDigits(m: number): number {
  return m >= 100 ? 0 : m >= 10 ? 1 : 2;
}

/** Formatea un número grande: 1.23K, 4.5M… y notación científica en cifras enormes. */
export function formatNumber(value: DecimalSource, notation: Notation = 'standard'): string {
  const v = value instanceof Decimal ? value : D(value);
  if (v.lt(0)) return '-' + formatNumber(v.neg(), notation);
  if (v.lt(1000)) {
    const n = v.toNumber();
    if (n === 0) return '0';
    if (n < 10) return trim(n, n < 1 ? 2 : 1);
    return Math.floor(n).toString();
  }
  const exp = Math.floor(v.log10().toNumber() + 1e-9);
  if (notation === 'scientific' || (notation === 'standard' && exp >= SUFFIXES.length * 3)) {
    const m = v.div(D(10).pow(exp)).toNumber();
    return `${trim(m, 2)}e${exp}`;
  }
  const group = Math.floor(exp / 3);
  const m = v.div(D(10).pow(group * 3)).toNumber();
  if (notation === 'engineering') return `${trim(m, mantissaDigits(m))}e${group * 3}`;
  return trim(m, mantissaDigits(m)) + SUFFIXES[group];
}

/** Duración legible: 45 s, 3 min 20 s, 2 h 5 min, 3 d 4 h. */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${s % 60 ? ` ${s % 60} s` : ''}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h${m % 60 ? ` ${m % 60} min` : ''}`;
  const d = Math.floor(h / 24);
  return `${d} d${h % 24 ? ` ${h % 24} h` : ''}`;
}
