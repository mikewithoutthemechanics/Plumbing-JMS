'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Quote } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  quoted: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminQuotesClient({ initialQuotes }: { initialQuotes: Quote[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [price, setPrice] = useState('');
  const router = useRouter();

  const updateQuote = async (id: string, status: Quote['status'], estimated_price?: number) => {
    const { error } = await fetch('/api/quotes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, estimated_price }),
    }).then(r => r.json());

    if (!error) {
      setQuotes(quotes.map(q => q.id === id ? { ...q, status, estimated_price } : q));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
        <span className="text-sm text-gray-500">{quotes.length} requests</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((quote) => (
          <div key={quote.id} className="card p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{quote.customer_name}</h3>
              <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[quote.status]}`}>
                {quote.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
            {quote.customer_email && <p className="text-xs text-gray-500">{quote.customer_email}</p>}
            {quote.customer_phone && <p className="text-xs text-gray-500">{quote.customer_phone}</p>}
            <div className="mt-3 flex gap-2">
              {quote.status === 'pending' && (
                <button
                  onClick={() => updateQuote(quote.id, 'reviewed')}
                  className="btn btn-secondary text-xs"
                >
                  Review
                </button>
              )}
              {quote.status === 'reviewed' && (
                <button
                  onClick={() => setSelectedQuote(quote)}
                  className="btn btn-primary text-xs"
                >
                  Quote
                </button>
              )}
              {quote.status === 'quoted' && (
                <>
                  <button
                    onClick={() => updateQuote(quote.id, 'accepted')}
                    className="btn btn-primary text-xs"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateQuote(quote.id, 'rejected')}
                    className="btn btn-secondary text-xs"
                  >
                    Reject
                  </button>
                </>
              )}
              {quote.estimated_price && (
                <span className="text-sm font-medium text-gray-900 ml-auto">
                  R {quote.estimated_price}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {quotes.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No quote requests yet.</p>
        </div>
      )}

      {/* Quote Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Quote</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Estimated Price (ZAR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateQuote(selectedQuote.id, 'quoted', parseFloat(price) || 0);
                    setSelectedQuote(null);
                    setPrice('');
                  }}
                  className="btn btn-primary"
                >
                  Send Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}