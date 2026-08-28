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
} from '../utils/calculations';

describe('calculations', () => {
  describe('formatCurrency', () => {
    it('formats ZAR currency correctly', () => {
      const result = formatCurrency(0);
      expect(result).toContain('R');
      expect(result).toContain('0');
      // en-ZA uses comma as decimal separator
      expect(result).toContain('0,00');
      expect(formatCurrency(1000)).toContain('1');
      expect(formatCurrency(1234.5)).toContain('1');
    });
  });

  describe('formatDateTime', () => {
    it('formats datetime string', () => {
      const result = formatDateTime('2024-06-15T10:30:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('Jun');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date to YYYY-MM-DD', () => {
      expect(formatDate('2024-06-15T10:30:00Z')).toBe('2024-06-15');
    });
  });

  describe('calculateHours', () => {
    it('calculates hours between two ISO strings', () => {
      const hours = calculateHours('2024-06-15T08:00:00Z', '2024-06-15T10:30:00Z');
      expect(hours).toBe(2.5);
    });

    it('returns 0 when clockOut is before clockIn', () => {
      expect(calculateHours('2024-06-15T10:00:00Z', '2024-06-15T08:00:00Z')).toBe(0);
    });

    it('calculates 0 for same timestamps', () => {
      expect(calculateHours('2024-06-15T08:00:00Z', '2024-06-15T08:00:00Z')).toBe(0);
    });
  });

  describe('calculateLabourCost', () => {
    it('calculates labour cost correctly', () => {
      expect(calculateLabourCost(100, 2)).toBe(200);
      expect(calculateLabourCost(150.5, 1.5)).toBeCloseTo(225.75);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateLabourCost(100, 1.234)).toBeCloseTo(123.4);
    });
  });

  describe('calculateMaterialsCost', () => {
    it('calculates materials cost correctly', () => {
      expect(calculateMaterialsCost([{ unitPrice: 10, quantity: 3 }])).toBe(30);
      expect(calculateMaterialsCost([{ unitPrice: 10, quantity: 3 }, { unitPrice: 5, quantity: 2 }])).toBe(40);
    });

    it('returns 0 for empty array', () => {
      expect(calculateMaterialsCost([])).toBe(0);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateMaterialsCost([{ unitPrice: 10.5, quantity: 3 }])).toBeCloseTo(31.5);
    });
  });

  describe('calculateVAT', () => {
    it('calculates 15% VAT correctly', () => {
      expect(calculateVAT(100)).toBe(15);
      expect(calculateVAT(200)).toBe(30);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateVAT(99.99)).toBeCloseTo(15);
    });
  });

  describe('calculateGrandTotal', () => {
    it('calculates subtotal + VAT', () => {
      expect(calculateGrandTotal(100)).toBe(115);
      expect(calculateGrandTotal(200)).toBe(230);
    });
  });

  describe('calculateJobTotals', () => {
    it('calculates all job totals correctly', () => {
      const result = calculateJobTotals(100, 2, [{ unitPrice: 50, quantity: 2 }]);
      expect(result.labour).toBe(200);
      expect(result.materialsCost).toBe(100);
      expect(result.subtotal).toBe(300);
      expect(result.vat).toBe(45);
      expect(result.grandTotal).toBe(345);
    });

    it('handles empty materials', () => {
      const result = calculateJobTotals(100, 1, []);
      expect(result.labour).toBe(100);
      expect(result.materialsCost).toBe(0);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(15);
      expect(result.grandTotal).toBe(115);
    });
  });
});
