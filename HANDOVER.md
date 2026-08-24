# Punctual Plumbers — Handover Pack

**Prepared:** 24 August 2026 · **Verified:** both projects build cleanly from a fresh clone on this date.

This pack contains the two production systems:

| # | Project | Repo | Stack | What it is |
|---|---------|------|-------|-----------|
| 1 | **Website** (`punctual-plumbers-pp-edit1-prod`) | github.com/mikewithoutthemechanics/punctual-plumbers-pp-edit1-prod (branch `major-overhaul-2026-08-21`) | React 19 + Vite 7 + Tailwind 4 | Marketing site. Builds to a **single self-contained `index.html`** (~950 KB). Includes a separate mobile variant under `mobile/`. |
| 2 | **Job Management System** (`Plumbing-JMS`) | github.com/mikewithoutthemechanics/Plumbing-JMS (branch `master`) | Next.js 16 + Supabase + React Query | Full JMS: job cards, quotes, invoices, staff, scheduling, procurement, debtors, web-push notifications, WhatsApp, magic-link auth. |

---

## 1. Website — build & deploy

```bash
cd punctual-plumbers-pp-edit1-prod
npm install          # ~30 s
npm run dev          # dev server
npm run build        # → dist/index.html (everything inlined: JS, CSS)
```

- **Output:** one file, `dist/index.html`. Host it anywhere — Vercel, Netlify, S3, plain nginx.
- **Vercel config** is included (`vercel.json`): security headers + CSP referencing Google Analytics and Pexels media.
- **Mobile variant:** `mobile/` is its own mini-app with its own `package.json` (`npm install && npm run dev`, port 5177).
- **No environment variables required.**

### Deploy to Vercel (recommended path used previously)
1. Import repo into Vercel; set Root Directory = repo root.
2. Build command `npm run build`, output dir `dist`.
3. Framework preset: Vite.

---

## 2. Plumbing-JMS — build & run

Requires: **Node 18+**, **pnpm** (`npm i -g pnpm`), a **Supabase project**, and email credentials.

```bash
cd Plumbing-JMS
pnpm install                 # ~90 s
cp .env.example .env.local   # then fill values below
pnpm run dev                 # http://localhost:3000
pnpm run build               # production build (verified ✓)
```

### Environment variables (`.env.local`, or Vercel project settings)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key (**secret** — never expose) |
| `AGENTMAIL_API_KEY` | Email sending via AgentMail |
| `AGENTMAIL_INBOX_ID` | e.g. `punctualplumbers@agentmail.to` |
| `FROM_EMAIL` / `FROM_NAME` | Outbound identity |
| `OWNER_NOTIFICATION_EMAIL` | Owner alert address |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL in production |

### Database setup (fresh Supabase project)

Run SQL in this order from the repo root:
1. `setup-database.sql`
2. `supabase_setup.sql`
3. `supabase_setup_additions.sql`

(Also present: `final_setup.sql` — check which was applied last on the live project before re-running anything against existing data.)

### Daily cron

`vercel.json` schedules `/api/notifications` daily at 00:00 UTC (notification digest). If self-hosting instead of Vercel, replicate with any scheduler hitting that endpoint once per day.

### Tests / tooling

```bash
pnpm test        # vitest unit tests
pnpm test:e2e    # playwright end-to-end
pnpm lint        # eslint
```

---

## 3. Credentials checklist before go-live

- [ ] Supabase project ownership transferred or new keys issued for the new owner
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY`
- [ ] AgentMail account/key handed over or replaced with the new owner's account
- [ ] `OWNER_NOTIFICATION_EMAIL` updated to the new owner's address
- [ ] Domain/DNS + Vercel project ownership transferred
- [ ] GitHub repos transferred (Settings → Danger Zone → Transfer ownership) or collaborators added
- [ ] Web-push VAPID keys noted/regenerated if push notifications are reconfigured
- [ ] Remove or update any analytics IDs belonging to the old owner

## 4. Known state at handover

- Both repos verified **in sync with their remotes** as of 24 Aug 2026.
- Website last commits (23 Aug): footer/FAQ fix, dark light-theme fix, noise-overlay removal.
- JMS last commits (23 Aug): CSP hydration fix, demo-admin button removed.
- JMS repo contains development artifacts (`*.log`, `playwright-report/`, plan `.md` files) — harmless, but can be pruned for a clean client-facing copy.

## 5. Where things live

```
punctual-handover/
├── HANDOVER.md                  ← you are here
├── punctual-plumbers-pp-edit1-prod/   (website source; dist/ = built site)
└── Plumbing-JMS/                      (JMS source)
```

Distribution archives:
- `punctual-plumbers-website.zip` — website incl. source + built `dist/`
- `plumbing-jms-source.zip` — full JMS source (no node_modules)
