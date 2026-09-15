'use client';

import { useEffect, useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { calculateJobTotals } from '@/lib/utils/calculations';

interface Invoice {
  id: string;
  invoice_number: string;
  amount_due: number;
  vat_amount: number;
  amount_paid: number;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  payments?: { id: string; amount: number; method: string; created_at: string; note?: string }[];
}

export default function JobFinancePanel({ jobId }: { jobId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ due: number; vat: number; labour: number; materials: number } | null>(null);

  // Hygiene fix: abort stale fetches when jobId changes; always clear loading.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase/client');
        if (!supabase) return;
        const { data } = await supabase
          .from('invoices')
          .select('id,invoice_number,amount_due,vat_amount,amount_paid,status,issued_at,paid_at,payments(id,amount,method,created_at,note)')
          .eq('job_card_id', jobId)
          .abortSignal(controller.signal);
        if (!cancelled) setInvoices((data as unknown as Invoice[]) || []);
      } catch {
        // fetch aborted or failed - keep previous invoices
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId]);

  // Live preview when no invoice exists — shows what invoice WOULD be (fixes "invoice doesn't update" confusion)
  useEffect(() => {
    if (invoices.length > 0) { setPreview(null); return; }
    (async () => {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) return;
      const [{ data: job }, { data: mats }, { data: logs }] = await Promise.all([
        supabase.from('job_cards').select('admin_hourly_rate').eq('id', jobId).single(),
        supabase.from('job_materials').select('admin_unit_price,quantity').eq('job_card_id', jobId),
        supabase.from('time_logs').select('hours').eq('job_card_id', jobId),
      ]);
      const materials = (mats || []).map((m: { admin_unit_price: number; quantity: number }) => ({ unitPrice: m.admin_unit_price || 0, quantity: m.quantity || 0 }));
      const hours = (logs || []).reduce((a: number, t: { hours: number }) => a + (t.hours || 0), 0);
      const rate = (job as unknown as { admin_hourly_rate: number } | null)?.admin_hourly_rate || 0;
      const t = calculateJobTotals(rate, hours, materials);
      setPreview({ due: t.grandTotal, vat: t.vat, labour: t.labour, materials: t.materialsCost });
    })();
  }, [jobId, invoices.length]);

  const totals = useMemo(() => {
    const due = invoices.reduce((a, i) => a + Number(i.amount_due || 0), 0);
    const paid = invoices.reduce((a, i) => a + Number(i.amount_paid || 0), 0);
    const vat = invoices.reduce((a, i) => a + Number(i.vat_amount || 0), 0);
    return { due, paid, vat, balance: due - paid };
  }, [invoices]);

  const exportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Invoices');
    ws.columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Amount Due', key: 'amount_due', width: 15 },
      { header: 'VAT', key: 'vat_amount', width: 12 },
      { header: 'Amount Paid', key: 'amount_paid', width: 15 },
      { header: 'Issued', key: 'issued_at', width: 20 },
      { header: 'Paid', key: 'paid_at', width: 20 },
    ];
    invoices.forEach(inv => ws.addRow({
      invoice_number: inv.invoice_number,
      status: inv.status,
      amount_due: inv.amount_due,
      vat_amount: inv.vat_amount,
      amount_paid: inv.amount_paid,
      issued_at: inv.issued_at,
      paid_at: inv.paid_at,
    }));
    ws.addRow({});
    ws.addRow({ invoice_number: 'TOTALS', amount_due: totals.due, vat_amount: totals.vat, amount_paid: totals.paid });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId}-invoices.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = invoices.map(inv => `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${inv.status}</td>
        <td>${Number(inv.amount_due).toFixed(2)}</td>
        <td>${Number(inv.vat_amount).toFixed(2)}</td>
        <td>${Number(inv.amount_paid).toFixed(2)}</td>
      </tr>`).join('');
    w.document.write(`
      <html><head><title>Job Invoices</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f3f4f6}
      </style></head><body>
        <h2>Job ${jobId} - Finance Summary</h2>
        <p>Total Due: ${totals.due.toFixed(2)} | Total Paid: ${totals.paid.toFixed(2)} | Balance: ${totals.balance.toFixed(2)}</p>
        <table><thead><tr><th>Invoice #</th><th>Status</th><th>Amount Due</th><th>VAT</th><th>Amount Paid</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    const { supabase } = await import('@/lib/supabase/client');
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const res = await fetch(`/api/invoices?id=${encodeURIComponent(invoiceId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || 'Failed to delete');
    else {
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Finance / Invoices (owner only)</h2>
        <div className="flex gap-2">
          <button onClick={exportXlsx} className="btn btn-secondary text-xs">Export XLSX</button>
          <button onClick={exportPdf} className="btn btn-secondary text-xs">Export PDF</button>
        </div>
      </div>
      {loading ? <p>Loading…</p> : (
        <>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">Total Due<br/><strong>{totals.due.toFixed(2)}</strong></div>
            <div className="p-3 bg-gray-50 rounded">VAT<br/><strong>{totals.vat.toFixed(2)}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Paid<br/><strong>{totals.paid.toFixed(2)}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Balance<br/><strong>{totals.balance.toFixed(2)}</strong></div>
          </div>
          {invoices.length === 0 && preview && preview.due > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <strong>Next invoice preview:</strong> {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(preview.due)} incl. VAT (Labour {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(preview.labour)} + Materials {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(preview.materials)} + VAT {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(preview.vat)})<br/>
              <span className="text-xs text-blue-700">Add materials / set rate above — this updates live. Click “Mark as To Be Invoiced” to create the invoice.</span>
            </div>
          )}
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr><th className="p-2 text-left">Invoice #</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Due</th><th className="p-2 text-right">VAT</th><th className="p-2 text-right">Paid</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-2">{inv.invoice_number}</td>
                    <td className="p-2">{inv.status}</td>
                    <td className="p-2 text-right">{Number(inv.amount_due).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(inv.vat_amount).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(inv.amount_paid).toFixed(2)}</td>
                    <td className="p-2 text-right"><button onClick={() => handleDeleteInvoice(inv.id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button></td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">{preview && preview.due > 0 ? 'No invoice yet — preview above shows what will be created' : 'No invoices yet — add materials and rate above'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
