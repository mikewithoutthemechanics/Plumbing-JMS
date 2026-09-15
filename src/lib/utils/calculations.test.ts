import { describe, it, expect } from 'vitest';
import { calculateJobTotals, calculateLabourCost, calculateMaterialsCost, calculateVAT, calculateGrandTotal, calculateHours } from './calculations';

// VAT 15% per src/lib/constants/job-states.ts:23
describe('calculations', () => {
  it('calculateJobTotals with zero hours and no materials', () => {
    const r = calculateJobTotals(450, 0, []);
    expect(r).toEqual({ labour: 0, materialsCost: 0, subtotal: 0, vat: 0, grandTotal: 0 });
  });

  it('calculateJobTotals with hours and materials', () => {
    // 450*1.5=675, materials 100*2=200, subtotal 875, vat 131.25, grand 1006.25
    const r = calculateJobTotals(450, 1.5, [{ unitPrice: 100, quantity: 2 }]);
    expect(r.labour).toBe(675);
    expect(r.materialsCost).toBe(200);
    expect(r.subtotal).toBe(875);
    expect(r.vat).toBe(131.25);
    expect(r.grandTotal).toBe(1006.25);
  });

  it('calculateHours clamps negative to 0', () => {
    // clockOut before clockIn
    expect(calculateHours('2026-09-15T10:00:00Z', '2026-09-15T09:00:00Z')).toBe(0);
  });

  it('calculateMaterialsCost with quantity 0', () => {
    expect(calculateMaterialsCost([{ unitPrice: 100, quantity: 0 }])).toBe(0);
  });

  it('calculateVAT and grandTotal rounding', () => {
    expect(calculateVAT(100)).toBe(15);
    expect(calculateGrandTotal(100)).toBe(115);
    // 33.33 * 0.15 = 4.9995 -> 5.00 after rounding
    expect(calculateVAT(33.33)).toBe(5);
  });

  it('calculateLabourCost zero rate', () => {
    expect(calculateLabourCost(0, 5)).toBe(0);
  });
});
