import { format } from 'date-fns';
import { VAT_RATE, CURRENCY } from '@/lib/constants/job-states';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: CURRENCY,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, HH:mm');
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function calculateHours(clockIn: string, clockOut: string): number {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export function calculateLabourCost(hourlyRate: number, hours: number): number {
  return Math.round(hourlyRate * hours * 100) / 100;
}

export function calculateMaterialsCost(materials: { unitPrice: number; quantity: number }[]): number {
  return Math.round(materials.reduce((sum, m) => sum + m.unitPrice * m.quantity, 0) * 100) / 100;
}

export function calculateVAT(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE * 100) / 100;
}

export function calculateGrandTotal(subtotal: number): number {
  const vat = calculateVAT(subtotal);
  return Math.round((subtotal + vat) * 100) / 100;
}

export function calculateJobTotals(
  hourlyRate: number,
  hours: number,
  materials: { unitPrice: number; quantity: number }[]
) {
  const labour = calculateLabourCost(hourlyRate, hours);
  const materialsCost = calculateMaterialsCost(materials);
  const subtotal = Math.round((labour + materialsCost) * 100) / 100;
  const vat = calculateVAT(subtotal);
  const grandTotal = Math.round((subtotal + vat) * 100) / 100;
  return { labour, materialsCost, subtotal, vat, grandTotal };
}
