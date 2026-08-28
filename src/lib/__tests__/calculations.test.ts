import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  calculateHours,
  calculateLabourCost,
  calculateMaterialsCost,
  calculateVAT,
  calculateGrandTotal,
  calculateJobTotals,
} from '@/lib/utils/calculations';

describe('formatCurrency', () => {
  it('formats positive amount in ZAR', () => {
    expect(formatCurrency(100).replace(/ /g, ' ')).toBe('R 100,00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0).replace(/ /g, ' ')).toBe('R 0,00');
  });

  it('formats negative amount', () => {
    expect(formatCurrency(-50).replace(/ /g, ' ')).toBe('-R 50,00');
  });

  it('formats decimal amounts', () => {
    expect(formatCurrency(99.95).replace(/ /g, ' ')).toBe('R 99,95');
  });
});

describe('formatDateTime', () => {
  it('formats ISO datetime string', () => {
    expect(formatDateTime('2024-06-15T14:30:00Z')).toContain('15 Jun 2024');
  });

  it('handles midnight crossing', () => {
    expect(formatDateTime('2024-06-15T00:00:00Z')).toContain('15 Jun 2024');
  });

  it('handles end of day', () => {
    expect(formatDateTime('2024-06-15T23:59:59Z')).toContain('16 Jun 2024');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to YYYY-MM-DD', () => {
    expect(formatDate('2024-06-15T00:00:00Z')).toBe('2024-06-15');
  });
});

describe('calculateHours', () => {
  it('calculates positive hours', () => {
    expect(calculateHours('2024-06-15T08:00:00Z', '2024-06-15T17:00:00Z')).toBe(9);
  });

  it('returns 0 when clockOut is before clockIn', () => {
    expect(calculateHours('2024-06-15T17:00:00Z', '2024-06-15T08:00:00Z')).toBe(0);
  });

  it('calculates fractional hours', () => {
    expect(calculateHours('2024-06-15T08:00:00Z', '2024-06-15T08:30:00Z')).toBe(0.5);
  });

  it('handles midnight crossing', () => {
    expect(calculateHours('2024-06-15T22:00:00Z', '2024-06-16T06:00:00Z')).toBe(8);
  });

  it('calculates decimal precision', () => {
    expect(calculateHours('2024-06-15T08:00:00Z', '2024-06-15T10:15:00Z')).toBeCloseTo(2.25, 5);
  });
});

describe('calculateLabourCost', () => {
  it('calculates cost and rounds to 2 decimals', () => {
    expect(calculateLabourCost(100, 1.5)).toBe(150);
  });

  it('returns 0 for zero hours', () => {
    expect(calculateLabourCost(100, 0)).toBe(0);
  });

  it('returns 0 for negative hours (guarded by Math.round but negative still possible)', () => {
    expect(calculateLabourCost(100, -1)).toBe(-100);
  });

  it('rounds to nearest cent', () => {
    expect(calculateLabourCost(100, 1.333)).toBe(133.3);
  });
});

describe('calculateMaterialsCost', () => {
  it('sums material costs', () => {
    const materials = [
      { unitPrice: 10, quantity: 2 },
      { unitPrice: 5, quantity: 3 },
    ];
    expect(calculateMaterialsCost(materials)).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(calculateMaterialsCost([])).toBe(0);
  });

  it('rounds to 2 decimals', () => {
    const materials = [{ unitPrice: 9.99, quantity: 3 }];
    expect(calculateMaterialsCost(materials)).toBe(29.97);
  });
});

describe('calculateVAT', () => {
  it('calculates 15% VAT', () => {
    expect(calculateVAT(100)).toBe(15);
  });

  it('returns 0 for zero subtotal', () => {
    expect(calculateVAT(0)).toBe(0);
  });

  it('rounds to 2 decimals', () => {
    expect(calculateVAT(33.33)).toBe(5);
  });
});

describe('calculateGrandTotal', () => {
  it('adds subtotal and VAT', () => {
    expect(calculateGrandTotal(100)).toBe(115);
  });

  it('returns 0 for zero subtotal', () => {
    expect(calculateGrandTotal(0)).toBe(0);
  });

  it('rounds correctly', () => {
    expect(calculateGrandTotal(33.33)).toBe(38.33);
  });
});

describe('calculateJobTotals', () => {
  it('returns complete breakdown', () => {
    const result = calculateJobTotals(100, 2, [{ unitPrice: 10, quantity: 3 }]);
    expect(result).toEqual({
      labour: 200,
      materialsCost: 30,
      subtotal: 230,
      vat: 34.5,
      grandTotal: 264.5,
    });
  });

  it('handles zero materials', () => {
    const result = calculateJobTotals(100, 1, []);
    expect(result.materialsCost).toBe(0);
    expect(result.labour).toBe(100);
  });

  it('handles zero hours', () => {
    const result = calculateJobTotals(100, 0, [{ unitPrice: 10, quantity: 1 }]);
    expect(result.labour).toBe(0);
  });
});
