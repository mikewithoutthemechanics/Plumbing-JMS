# Archived Outstanding Items - Precision Plumbing Review

Archived on 2026-08-21. Items refer to legacy React components not present in current Plumbing-JMS Next.js codebase.

## Actionable Items from Precision Plumbing Review

### P0 — Immediate (Blocking Production)
- [ ] **Fix Testimonials.jsx line 4**: Change `{ Name: ... }` to `{ name: ... }` to prevent rendering `undefined`.
- [ ] **Fix JobCard.jsx lines 48-63**: Destructure `labourCost`, `materialCost`, `vat`, `total` from `calculateTotal()` result to avoid `ReferenceError`.
- [ ] **Fix JobCard.jsx line 67**: Ensure `sendToAccountant` uses `total` from destructured `calculateTotal()` result (not out of scope).
- [ ] **Fix tests/screenshots.spec.js line 16**: Remove or fix the hardcoded Windows path `C:/Users/Nate/Desktop/...` to be cross-platform.
- [ ] **Fix Contact.jsx line 22**: Implement actual form submission (e.g., via emailjs-com or backend) instead of just `alert()`.
- [ ] **Remove/secure sensitive data in JobCard.jsx**:
  - Lines 60 & 190: Remove or secure real bank account details exposed in source code.
  - Line 4: Remove or secure real accountant email exposed in source code.
- [ ] **Fix AdminNavbar.jsx line 5**: Add null check before `JSON.parse(localStorage.getItem('pp_user'))` to prevent crash on null.
- [ ] **Fix App.jsx line 40**: Add null check before `JSON.parse(localStorage.getItem('pp_user'))` to prevent crash if localStorage cleared.
- [x] **Fix vercel.json**: Add SPA rewrite rule (`{ "source": "/(.*)", "destination": "/" }`) so deep links don't 404 on Vercel.
- [ ] **Address hardcoded credentials**: Do not deploy `Login.jsx`/`App.jsx` with current credentials; rotate accountant email if it is real.

### P1 — Required for any real deployment
- [ ] **Add JWT/bearer token authentication** with a real backend (Express/Fastify/Next.js API).
- [ ] **Replace localStorage** with a real database (PostgreSQL recommended).
- [ ] **Hash passwords** with bcrypt/argon2 — never store plaintext passwords.
- [ ] **Add server-side authorization middleware**.
- [ ] **Add CSRF protection, CSP headers, and rate limiting** (e.g., using `express-rate-limit`).

### P2 — Architecture upgrades
- [ ] **Add Row Level Security (RLS)** at the PostgreSQL level (not just application-level checks).
- [ ] **Add logging/audit trail** for job changes.
- [ ] **Wire up emailjs-com or a real email service** for the contact form submission.
- [ ] **Create missing db.json and seed.js files** or remove `json-server` from `package.json`.
- [ ] **Implement proper tests** with fixed paths and mocked localStorage (fix `screenshots.spec.js` and add unit tests).
