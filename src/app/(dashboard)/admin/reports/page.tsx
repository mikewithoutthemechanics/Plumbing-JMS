import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const MOCK_JOBS = [
  { status: 'pending', grand_total: 0 },
  { status: 'assigned', grand_total: 0 },
  { status: 'in_progress', grand_total: 1920.5 },
  { status: 'completed', grand_total: 983.25 },
  { status: 'invoiced', grand_total: 983.25 },
];

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  let jobs;
  if (devMode) {
    jobs = MOCK_JOBS;
  } else {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'owner') return null;

    const { data } = await supabase.from('job_cards').select('status, grand_total');
    jobs = data || [];
  }

  const summary = jobs.reduce((acc, job) => {
    const status = job.status as 'pending' | 'assigned' | 'in_progress' | 'completed' | 'invoiced';
    acc[status] = (acc[status] || 0) + 1;
    acc.total += job.grand_total;
    if (status === 'invoiced') acc.invoicedTotal += job.grand_total;
    return acc;
  }, { total: 0, invoicedTotal: 0, pending: 0, assigned: 0, in_progress: 0, completed: 0, invoiced: 0 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Jobs</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{jobs.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(summary.total)}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">Invoiced</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(summary.invoicedTotal)}
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Status</h3>
        <div className="space-y-3">
          {(['pending', 'assigned', 'in_progress', 'completed', 'invoiced'] as const).map((status) => (
            <div key={status} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{status.replace('_', ' ')}</span>
              <span className="text-sm font-semibold text-gray-900">{(summary as Record<string, number>)[status] || 0} jobs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
