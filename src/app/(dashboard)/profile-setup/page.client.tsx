'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Profile {
  role: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export default function ProfileSetupClient({ userId, profile }: { userId: string; profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const complete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { error: err } = await supabase.from('profiles').update({
      full_name: fullName,
      email,
      phone,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/technician/jobs');
    router.refresh();
  };

  const isComplete = fullName.trim() && email.trim() && phone.trim();

  return (
    <div className="max-w-md mx-auto mt-12 card p-6 space-y-4">
      <h1 className="text-xl font-semibold">Complete Your Profile</h1>
      <p className="text-sm text-gray-600">Technicians need to set up their name, email and WhatsApp number before creating jobs.</p>
      <form onSubmit={complete} className="space-y-3">
        <div>
          <label className="text-sm">Full Name</label>
          <input className="input w-full" value={fullName} onChange={e=>setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input type="email" className="input w-full" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">WhatsApp Number</label>
          <input className="input w-full" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+27..." required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading || !isComplete} className="btn btn-primary w-full">{loading ? 'Saving...' : 'Continue'}</button>
      </form>
    </div>
  );
}
