import { redirect } from 'next/navigation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rescue shim for quote-enquiry email links sent in the old format
// (/admin/quotes/<id>, which has no matching route).
// Forwards to the list page with ?quote=<id>, which scrolls to and
// highlights the card. Anything else falls through to the plain list.
export default async function AdminQuoteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Path params arrive URL-decoded, so only ever forward genuine quote UUIDs.
  if (!UUID_RE.test(id)) redirect('/admin/quotes');
  redirect(`/admin/quotes?quote=${encodeURIComponent(id)}`);
}
