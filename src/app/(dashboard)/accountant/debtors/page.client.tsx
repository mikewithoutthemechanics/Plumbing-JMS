'use client';

import { useState } from 'react';
import type { Invoice } from '@/types';

interface Debtor {
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  outstanding: number;
  open_invoices: number;
}

interface Props {
  initialDebtors: Debtor[];
  totalOutstanding: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function DebtorsClient({ initialDebtors, totalOutstanding }: Props) {
  const [debtors, setDebtors] = useState<Debtor[]>(initialDebtors);
  const [selected, setSelected] = useState<Debtor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payInvoice, setPayInvoice] = useState<string>('');

  const selectDebtor = async (d: Debtor) => {
    setSelected(d);
    setLoading(true);
    const res = await fetch(`/api/invoices?customerId=${d.customer_id}`);
    if (res.ok) {
      const json = await res.json();
      setInvoices(json.invoices.filter((i: Invoice) => i.status !== 'paid'));
    }
    setLoading(false);
  };

  const sendReminder = async (invoiceId: string) => {
    setLoading(true);
    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    if (res.ok) alert('Reminder sent via WhatsApp.');
    else {
      const err = await res.json();
      alert('WhatsApp error: ' + err.error);
    }
    setLoading(false);
  };

  const recordPayment = async () => {
    if (!payInvoice || !payAmount) return;
    setLoading(true);
    const res = await fetch('/api/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: payInvoice, amount: parseFloat(payAmount), method: 'eft' }),
    });
    if (res.ok) {
      const json = await res.json();
      setInvoices(invoices.map((i) => (i.id === payInvoice ? (json.invoice as Invoice) : i)));
      setDebtors(debtors.map((d) =>
        d.customer_id === selected?.customer_id
          ? { ...d, outstanding: Math.max(0, d.outstanding - parseFloat(payAmount)) }
          : d
      ));
      setPayAmount('');
      setPayInvoice('');
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Debtors</h1>

      <div className="card p-6 bg-red-50 border border-red-200">
        <h3 className="text-sm font-medium text-red-700">Total Outstanding</h3>
        <p className="text-4xl font-bold text-red-700 mt-1">{fmt(totalOutstanding)}</p>
        <p className="text-sm text-red-600 mt-1">{debtors.length} account(s) with outstanding balances</p>
      </div>

      {!selected && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {debtors.map((d) => (
            <button
              key={d.customer_id}
              onClick={() => selectDebtor(d)}
              className="card p-4 text-left hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900">{d.customer_name}</h3>
              <p className="text-xl font-bold text-red-600 mt-2">{fmt(Number(d.outstanding))}</p>
              <p className="text-sm text-gray-500 mt-1">{d.open_invoices} open invoice(s)</p>
              {d.customer_phone && <p className="text-sm text-gray-500">{d.customer_phone}</p>}
            </button>
          ))}
          {debtors.length === 0 && (
            <div className="col-span-full card p-8 text-center text-gray-500">No outstanding debtors. 🎉</div>
          )}
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => { setSelected(null); setInvoices([]); }} className="btn btn-secondary">← Back to Debtors</button>
            <h2 className="text-lg font-semibold">{selected.customer_name}</h2>
          </div>

          <div className="card p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Record Payment</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Invoice</label>
                <select value={payInvoice} onChange={(e) => setPayInvoice(e.target.value)} className="input">
                  <option value="">Select invoice…</option>
                  {invoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} — {fmt(i.amount_due - i.amount_paid)} due
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount (ZAR)</label>
                <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input w-40" />
              </div>
              <button onClick={recordPayment} disabled={loading || !payInvoice || !payAmount} className="btn btn-primary">
                Mark Paid
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((i) => (
                  <tr key={i.id} className="text-sm">
                    <td className="px-4 py-2 font-medium">{i.invoice_number}</td>
                    <td className="px-4 py-2">{fmt(i.amount_due)}</td>
                    <td className="px-4 py-2">{fmt(i.amount_paid)}</td>
                    <td className="px-4 py-2 text-red-600 font-medium">{fmt(i.amount_due - i.amount_paid)}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs ${i.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{i.status}</span></td>
                    <td className="px-4 py-2">
                      {/* WhatsApp removed */}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-3 text-gray-500">No open invoices.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
