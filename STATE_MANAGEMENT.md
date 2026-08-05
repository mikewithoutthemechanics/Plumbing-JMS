# State Management in Plumbing JMS

## Overview

This document explains the state management approach used in the Plumbing JMS application. We follow a clear separation between server state and client state to optimize performance, maintainability, and developer experience.

## Architecture Overview

We use two complementary state management solutions:

1. **React Query (TanStack Query)** for server state
2. **React Context** combined with `useState`/`useReducer` for client state

This separation follows the principles outlined in ADR 0003.

## Server State with React Query

### What is Server State?

Server data is any data that:
- Originates from a remote server/database
- Can be modified by other users
- May become outdated (stale)
- Requires fetching, updating, deleting, or creating

Examples in our application:
- Job cards, customers, staff members
- Materials inventory
- Banking details
- User profiles and roles

### Why React Query?

React Query provides excellent defaults for server state management:
- Automatic caching and garbage collection
- Request deduplication
- Background updates and stale-while-revalidate
- Pagination and infinite query support
- Mutation optimization with optimistic updates
- Automatic garbage collection of unused data
- Memory and CPU efficiency

### Implementation

Our React Query setup is centralized in `src/app/providers.tsx`:

```typescript
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Usage Patterns

#### Fetching Data with `useQuery`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase/client');
      const { data, error } = await supabase
        .from('jobs')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });
}
```

#### Modifying Data with `useMutation`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Job } from '@/types';

function useUpdateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Job>) => {
      const { supabase } = await import('@/lib/supabase/client');
      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', updates.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('Failed to update job:', error);
    }
  });
}
```

## Client State with React Context

### What is Client State?

Client state is UI-specific data that:
- Originates and lives only on the client
- Is not persisted to the server
- Does not need to be synchronized with other clients
- Controls UI behavior and appearance

Examples in our application:
- Theme preferences (light/dark mode)
- Modal open/close states
- Form input values (before submission)
- UI flags (loading states, tooltip visibility)
- Temporary selection states

### Why React Context?

For client state, we use React Context because:
- It's built into React (no extra dependencies)
- Perfect for truly global UI state (theme, auth status)
- Simple API for provider/consumer pattern
- Excellent for state that doesn't change frequently
- Integrates naturally with React's rendering lifecycle

### Implementation Examples

#### Auth Context (`src/app/providers.tsx` extended)

Our authentication state is managed via a combination of:
- Supabase auth state (server state via React Query)
- Local client state for development/demo modes

See `src/app/(dashboard)/layout.tsx` for client-side auth state management using localStorage.

#### Theme Context Example

```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    // Persist to localStorage if desired
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

## Best Practices

### When to Use React Query

Use React Query when:
- Fetching data from Supabase/API
- Data needs caching and background updates
- Implementing pagination, infinite scroll, or prefetching
- Performing mutations (create/update/delete)
- Want automatic refetching on window focus/reconnect
- Need request deduplication

### When to Use React Context

Use React Context when:
- Managing UI-only state (modals, tabs, tooltips)
- Theme preferences or UI
- Simple boolean toggles )
- State that is minimal server server state that might be used across screens and doesn't change often
### Anti-Patterns to Avoid

1. **Don't put server state in Context**
   - This defeats React Query's caching/deduplication benefits
   - Causes unnecessary re-fetches when context providers re-render
   - Loses background update/refetch capabilities

2. **Don't overuse Context for frequently-changing state**
   - Context providers cause all consuming components to re-render
   - For high-frequency UI state (like form inputs), use local state (`useState`) or state_colocated_with_component patterns

3. **Don't mutate cached data directly**
   - Always use React Query's mutator functions (`mutate`, `mutateAsync`)
   - Direct cache mutation can cause inconsistencies

##

React Query provides powerful inspection and
React Query Devtools can lead to inconsistencies

4. **Don't ignore loading/error states**
   - Always handle `isLoading`, `isError` states from React Query hooks
   - Provide good UX during data fetching

## Performance Considerations

### React Query Optimizations

- **Stale Time**: Set appropriately based on data volatility (we use 5 minutes as default)
- **Cache Time**: Controls how long unused data stays in memory (React Query default is 5 minutes)
- **Selectors**: Use `select` option in `useQuery` to extract only needed data, reducing re-renders
- **Pagination**: Use `keepPreviousData: true` for smooth pagination UX

### Context Optimization

- Split contexts by concern (don't put all app state in one context)
- Use `React.memo` for components that consume context when appropriate
- Consider `useReducer` for complex state objects to prevent unnecessary re-creations

## Debugging & DevTools

### React Query Devtools
Install `@tanstack/react-query-devtools` for development:
```bash
npm install --save-dev @tanstack/react-query-devtools
```

Then add to your app:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </Providers>
      </body>
    </html>
  );
}
```

### React DevTools Profiler
Use React DevTools to:
- Identify unnecessary re-renders from context changes
- Monitor component render frequency
- Validate context provider boundaries

## Migration Guide

If you're working with existing code:

### Migrating from Local State to React Query
1. Identify data that comes from server (props, hooks, effects that fetch data)
2. Replace `useState`/`useEffect` fetching patterns with `useQuery`
3. Move mutation logic to `useMutation`
4. Remove manual caching/invalidation logic (React Query handles this)

### Migrating from Redux/Zustand to Context
1. Identify truly client-state pieces (UI toggles, form state, etc.)
2
3.  Wrap components with appropriate Context providers
    
    3
    
    ### Testing Guidelines
    
    #### Testing Server State (React Query)
    
    - Use `@tanstack/react-query/test` utilities
    - Mock `queryClient` in tests
    - Test loading, error, and success states
    - Verify cache invalidation and refetching behavior
    
    #### Testing Client State (Context)
    
    - Render components within appropriate context providers
    - Test state updates trigger re-renders as expected
    - Test context consumer components in isolation with mocked context
    
    ## Summary
    
    By separating server state (React Query) from client state (Context), we achieve:
    
    1. **Better Performance**: Automatic caching, deduplication, and background updates
    2. **Clearer Code Architecture**: Obvious separation of concerns
    3. **Reduced Boilerplate**: Less manual state management logic
    4. **Improved Developer Experience**: Excellent devtools and TypeScript support
    5. **Scalability**: Pattern works well as application grows
    
    This approach gives us the best of both worlds: powerful server state management with React Query's sophisticated features, and simple, built-in client state management with React Context.