# ADR 0003: Use React Query for Server State and React Context for Client State

## Status
Accepted

## Context
We need to manage state in the application. There are two types of state:
1. Server state: Data that is stored on the backend and needs to be fetched, updated, and synchronized (e.g., jobs, customers, staff).
2. Client state: UI state that is specific to the client and does not need to be sent to the server (e.g., modal open/close, form input values, theme).

We evaluated several state management solutions.

## Decision
- For server state, we will use React Query (tanstack/query) because it provides:
  - Automatic caching and background updates
  - Request deduplication
  - Pagination and infinite query support
  - Mutation optimizations
  - Integration with React Suspense (if needed)
- For client state, we will use React Context combined with useState/useReducer for simplicity and to avoid adding extra dependencies for simple state.

## Consequences
### Pros
- Separation of concerns: server state and client state are managed by different tools optimized for their use cases.
- React Query reduces boilerplate for data fetching and updating.
- React Context is built-in and sufficient for global UI state (like theme, user preferences).

### Cons
- Developers need to understand the distinction between server and client state.
- Overhead of learning React Query if the team is not familiar with it.

## Alternatives Considered
1. **Zustand**: A small, fast, and scalable state management solution.
   - Pros: Simple API, good performance, can handle both server and client state.
   - Cons: Would require more manual handling of data fetching and caching compared to React Query.

2. **Redux Toolkit**: A powerful state management library.
   - Pros: Excellent devtools, middleware support, powerful for complex state interactions.
   - Cons: More boilerplate, might be overkill for our application's needs.

3. **Jotai or Recoil**: Atomic state management approaches.
   - Pros: Fine-grained reactivity.
   - Cons: Learning curve, and not necessarily better than our chosen approach for our use case.

## Implementation Status
Implemented: We are using React Query for data fetching (see `useQuery` and `useMutation` in various components) and React Context for theme and authentication state (see `src/app/providers.tsx).

## Related Decisions
- ADR 0001: Use Supabase as the Backend (provides the data that React Query fetches)
- ADR 0002: Use Next.js App Router for Routing and Server Components

## Notes
We may consider using React Query's `useSubscription` for real-time updates if we need to subscribe to database changes (via Supabase Realtime) in the future.