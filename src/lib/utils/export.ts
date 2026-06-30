import * as XLSX from 'xlsx';

export interface JobExportRow {
  JobNumber: string;
  Date: string;
  Customer: string;
  Technician: string;
  Status: string;
  Description: string;
  LabourHours: number;
  LabourRate: number;
  LabourCost: number;
  MaterialsCost: number;
  Subtotal: number;
  VAT: number;
  GrandTotal: number;
  AdminNotes: string;
}

export function generateExcelExport(jobs: JobExportRow[], bankingDetails: { bankName: string; accountName: string; accountNumber: string; branchCode: string; referencePrefix: string }) {
  const wb = XLSX.utils.book_new();

  const headerRow = ['JOB CARD REPORT', '', '', '', '', '', '', formatDate(new Date())];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headerRow]), 'Report');

  const summaryData = [
    ['PAYMENT VIA EFT TO THE FOLLOWING BANK ACCOUNT:'],
    ['Bank:', bankingDetails.bankName],
    ['Account Name:', bankingDetails.accountName],
    ['Account Number:', bankingDetails.accountNumber],
    ['Branch Code:', bankingDetails.branchCode],
    ['Reference:', `${bankingDetails.referencePrefix} + Job Number`],
    [],
    ['Grand Total:', `=SUM(L2:L${jobs.length + 1})`],
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Banking');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobs), 'JobCards');

  const colWidths = [
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 25 },
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
  ];

  wb.Sheets['JobCards']['!cols'] = colWidths;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  return Buffer.from(buffer);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
