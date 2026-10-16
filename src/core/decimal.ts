import Decimal from 'break_eternity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

/** Atajo para crear un Decimal. */
export const D = (v: DecimalSource): Decimal => new Decimal(v);

export const ZERO = D(0);
export const ONE = D(1);
