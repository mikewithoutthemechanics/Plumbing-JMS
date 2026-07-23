# ADR 0002: Use Next.js App Router for Routing and Server Components

## Status
Accepted

## Context
We are building a Next.js application and need to decide on the routing and rendering approach. The options include:
- Pages Router (file-system based routing in pages/ directory)
- App Router (file-system based routing in app/ directory with server components)
- Hybrid approach

## Decision
We will use the Next.js App Router (app/ directory) for all new development, leveraging React Server Components where appropriate.

## Consequences
### Pros
- Server Components reduce JavaScript sent to the browser, improving performance
- Nested layouts and routing capabilities
- Better data fetching patterns with fetch caching and deduplication
- Streaming and suspense support
- Aligns with the future direction of Next.js

### Cons
- Learning curve for developers accustomed to Pages Router
- Some libraries may not yet be fully compatible with Server Components
- Migration effort if we ever need to support older Next.js versions

## Implementation Status
Implemented: The application uses the App Router (app/ directory) with route groups for authentication ((auth)) and dashboard sections ((dashboard)).

## Related Decisions
- ADR 0001: Use Supabase as the Backend
- ADR 0003: Use Zustand for state management (if applicable, adjust as needed)

## Notes
We use server components for data fetching and client components only when interactivity or browser APIs are needed.