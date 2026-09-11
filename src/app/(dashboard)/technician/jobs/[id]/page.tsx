import { redirect } from 'next/navigation';

// Rescue shim for job-assigned email/push links sent before the deep-link
// fix (format: /technician/jobs/<id>, which has no matching route).
// Forwards to the list page with ?job=<id>, which auto-opens the job detail.
// Unknown ids fall through to the plain list — never a 404.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TechnicianJobRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Path params arrive URL-decoded, so only ever forward genuine job UUIDs —
  // anything else (e.g. "123&job=evil") drops to the plain list.
  if (!UUID_RE.test(id)) redirect('/technician/jobs');
  redirect(`/technician/jobs?job=${encodeURIComponent(id)}`);
}
