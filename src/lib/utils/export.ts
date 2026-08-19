import ExcelJS from 'exceljs';

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

export async function generateExcelExport(
  jobs: JobExportRow[],
  bankingDetails: { bankName: string; accountName: string; accountNumber: string; branchCode: string; referencePrefix: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Report sheet
  const reportSheet = workbook.addWorksheet('Report');
  reportSheet.addRow(['JOB CARD REPORT', '', '', '', '', '', '', formatDate(new Date())]);

  // Banking sheet
  const bankingSheet = workbook.addWorksheet('Banking');
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
  summaryData.forEach(row => bankingSheet.addRow(row));

  // JobCards sheet
  const jobCardsSheet = workbook.addWorksheet('JobCards');
  
  // Add header row
  const headers = Object.keys(jobs[0] || {});
  jobCardsSheet.addRow(headers);
  
  // Add data rows
  jobs.forEach(job => {
    jobCardsSheet.addRow(Object.values(job));
  });

  // Set column widths
  const colWidths = [12, 12, 25, 25, 12, 40, 12, 12, 12, 14, 12, 12, 14, 30];
  jobCardsSheet.columns = colWidths.map(w => ({ width: w }));

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}