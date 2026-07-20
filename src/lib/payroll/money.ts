import { Decimal } from "decimal.js";

export type Money = Decimal;

export function money(value: Decimal.Value): Money {
  return new Decimal(value);
}

export const ZERO: Money = money(0);

/** Redondeo a 2 decimales, convención AFIP (half-up). */
export function round2(value: Decimal.Value): Money {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sum(values: Decimal.Value[]): Money {
  return values.reduce((acc: Money, v) => acc.plus(v), ZERO);
}

export function max(...values: Money[]): Money {
  return values.reduce((a, b) => (a.gte(b) ? a : b));
}

export function min(...values: Money[]): Money {
  return values.reduce((a, b) => (a.lte(b) ? a : b));
}
