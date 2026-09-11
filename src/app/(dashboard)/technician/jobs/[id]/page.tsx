import { redirect } from 'next/navigation';

// Rescue shim for job-assigned email/push links sent before the deep-link
// fix (format: /technician/jobs/<id>, which has no matching route).
// Forwards to the list page with ?job=<id>, which auto-opens the job detail.
// Unknown ids fall through to the plain list — never a 404.
export default async function TechnicianJobRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/technician/jobs?job=${id}`);
}
