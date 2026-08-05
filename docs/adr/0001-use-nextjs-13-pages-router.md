# ADR 0001: Use Next.js 13 Pages Router

## Status
Accepted

## Context
We need to decide on the routing strategy for our Next.js application. Next.js offers both the Pages Router (file-system based routing in pages/ directory) and the App Router (new routing system in app/ directory introduced in Next.js 13).

## Decision
We will use the Next.js 13 Pages Router (pages/ directory) for routing in the Plumbing JMS application.

## Consequences

### Positive
- Team familiarity with the Pages Router approach
- Stable and well-documented routing solution
- Compatible with existing Next.js 13 features
- Easier migration path from older Next.js versions
- Good performance for our use case

### Negative
- Missing out on some newer App Router features like React Server Components by default
- Less flexible nested routing compared to App Router
- May require migration if we want to adopt App Router features in the future

## Implications
- All pages will be placed in the `src/pages/` directory
- API routes will be in `src/pages/api/`
- We can still use next/navigation for client-side navigation
- Layouts will need to be implemented differently than in App Router