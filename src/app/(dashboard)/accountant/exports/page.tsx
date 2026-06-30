import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const MOCK_INVOICED = [
  { id: 'mock-job-2', job_number: 'JOB-MOCK-002', customer: { name: 'Sarah Johnson' }, assigned_to_profile: { full_name: 'Mike the Plumber' }, grand_total: 983.25 },
];

export default async function AccountantExportsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  let jobs;
  if (devMode) {
    jobs = MOCK_INVOICED;
  } else {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'accountant') return null;

    const { data } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name)
      `)
      .in('status', ['invoiced'])
      .order('invoiced_at', { ascending: false });
    jobs = data || [];
  }

  const totalInvoiced = jobs.reduce((sum, j) => sum + (j.grand_total || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Exports</h1>

      <div className="card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Total Invoiced</h3>
          <p className="text-3xl font-bold text-green-600">
            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalInvoiced)}
          </p>
        </div>

        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-mono text-sm">{job.job_number}</span>
                <p className="text-sm text-gray-600">
                  {job.customer?.name} • {job.assigned_to_profile?.full_name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.grand_total)}</p>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <p className="text-gray-500">No invoiced jobs available for export.</p>
        )}
      </div>
    </div>
  );
}
