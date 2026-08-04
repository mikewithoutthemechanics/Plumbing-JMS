# Plumbing-JMS API Documentation

## Overview

This document describes the API layer of the Plumbing-JMS application, including the Supabase service layer and React Query hooks for data fetching and mutations.

## Service Layer (`src/lib/supabase/services.ts`)

The service layer provides a clean abstraction over Supabase operations, making the code more testable and maintainable.

### Generic Functions

#### `getRows<T>(table: T, filters: any[] = []): Promise<any[]>`
Retrieve multiple rows from a table with optional filters.

**Parameters:**
- `table`: The table name (must be one of: 'jobs', 'customers', 'materials', 'users')
- `filters`: Array of filter conditions in the format `[column, operator, value]`

**Operators Supported:**
- `eq` - equals
- `neq` - not equals
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `like` - SQL LIKE pattern matching
- `ilike` - case-insensitive LIKE
- `is` - IS NULL/IS NOT NULL (value should be true/false or 'null'/'not null')
- `in` - value IN (list)
- `cs` - contains (string)
- `cd` - contained in (string)
- `sl` - resembles (string, full-text search)
- `sr` - reverse resembles (string, full-text search)

**Example:**
```typescript
// Get jobs with status 'pending' and priority > 2
const jobs = await getRows('jobs', [
  ['status', 'eq', 'pending'],
  ['priority', 'gt', 2]
]);
```

#### `getRowById<T>(table: T, id: string): Promise<any | null>`
Retrieve a single row by its ID.

**Parameters:**
- `table`: The table name
- `id`: The record ID

**Example:**
```typescript
const customer = await getRowById('customers', 'customer-uuid');
```

#### `insertRow<T>(table: T, data: any): Promise<any>`
Insert a new row into a table.

**Parameters:**
- `table`: The table name
- `data`: Object containing the data to insert

**Example:**
```typescript
const newJob = await insertRow('jobs', {
  customer_id: 'cust-uuid',
  description: 'Fix leaky faucet',
  status: 'pending',
  priority: 3
});
```

#### `updateRow<T>(table: T, id: string, data: any): Promise<any>`
Update an existing row by ID.

**Parameters:**
- `table`: The table name
- `id`: The record ID
- `data`: Object containing the fields to update

**Example:**
```typescript
const updatedJob = await updateRow('jobs', 'job-uuid', {
  status: 'completed',
  completed_at: new Date().toISOString()
});
```

#### `deleteRow<T>(table: T, id: string): Promise<void>`
Delete a row by ID.

**Parameters:**
- `table`: The table name
- `id`: The record ID

**Example:**
```typescript
await deleteRow('materials', 'material-uuid');
```

### Specific Exports

For convenience, the service layer exports specific functions for each table:

#### Jobs
- `getJobs(filters?: any[]): Promise<any[]>` - Get jobs with filters
- `getJob(id: string): Promise<any | null>` - Get single job
- `createJob(data: any): Promise<any>` - Create job
- `updateJob(id: string, data: any): Promise<any>` - Update job
- `deleteJob(id: string): Promise<void>` - Delete job

#### Customers
- `getCustomers(filters?: any[]): Promise<any[]>` - Get customers with filters
- `getCustomer(id: string): Promise<any | null>` - Get single customer
- `createCustomer(data: any): Promise<any>` - Create customer
- `updateCustomer(id: string, data: any): Promise<any>` - Update customer
- `deleteCustomer(id: string): Promise<void>` - Delete customer

#### Materials
- `getMaterials(filters?: any[]): Promise<any[]>` - Get materials with filters
- `getMaterial(id: string): Promise<any | null>` - Get single material
- `createMaterial(data: any): Promise<any>` - Create material
- `updateMaterial(id: string, data: any): Promise<any>` - Update material
- `deleteMaterial(id: string): Promise<void>` - Delete material

#### Users
- `getUsers(filters?: any[]): Promise<any[]>` - Get users with filters
- `getUser(id: string): Promise<any | null>` - Get single user
- `createUser(data: any): Promise<any>` - Create user
- `updateUser(id: string, data: any): Promise<any>` - Update user
- `deleteUser(id: string): Promise<void>` - Delete user

## React Query Hooks (`src/lib/hooks/`)

All hooks use `@tanstack/react-query` for efficient data fetching and state management.

### Query Hooks (Read Operations)

#### `useJobs(filters = [])`
Fetch jobs with optional filters.

**Parameters:**
- `filters`: Array of filter conditions (same format as service layer)

**Returns:** React Query query object with:
- `data`: Array of job objects or undefined
- `isLoading`: Boolean indicating fetch status
- `isError`: Boolean indicating error status
- `error`: Error object if failed

**Example:**
```typescript
import { useJobs } from '@/lib/hooks/useJobs';

function JobsList() {
  const { data: jobs, isLoading, error } = useJobs([
    ['status', 'eq', 'active']
  ]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading jobs</div>;

  return (
    <ul>
      {jobs?.map(job => (
        <li key={job.id}>{job.description}</li>
      ))}
    </ul>
  );
}
```

#### `useCustomer(id)`
Fetch a single customer by ID.

**Parameters:**
- `id`: Customer ID

#### `useMaterials(filters = [])`
Fetch materials with optional filters.

**Parameters:**
- `filters`: Array of filter conditions

#### `useUser(id)`
Fetch a single user by ID.

**Parameters:**
- `id`: User ID

#### `useJob(id)`
Fetch a single job by ID.

**Parameters:**
- `id`: Job ID

**All query hooks share these options:**
- `staleTime`: 5 minutes (1000 * 60 * 5 ms)
- Automatic refetching on window focus
- Configurable via React Query providers

### Mutation Hooks (Write Operations)

All mutation hooks implement optimistic updates for instant UI feedback.

#### Creation Hooks
- `useCreateJob()`
- `useCreateCustomer()`
- `useCreateMaterial()`
- `useCreateUser()`

**Usage pattern:**
```typescript
import { useCreateJob } from '@/lib/hooks/useCreateJob';

function AddJobForm() {
  const [formData, setFormData] = useState({ /* form fields */ });
  const { mutate: createJob, isLoading, isError, error } = useCreateJob();

  const handleSubmit = (e) => {
    e.preventDefault();
    createJob(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Job'}
      </button>
      {isError && <div>Error: {error?.message}</div>}
    </form>
  );
}
```

#### Update Hooks
- `useUpdateJob()`
- `useUpdateCustomer()`
- `useUpdateMaterial()`
- `useUpdateUser()`

**Usage pattern:**
```typescript
import { useUpdateJob } from '@/lib/hooks/useUpdateJob';

function EditJob({ jobId }) {
  const [formData, setFormData] = useState({ /* form fields */ });
  const { mutate: updateJob, isLoading, isError, error } = useUpdateJob();

  const handleSubmit = (e) => {
    e.preventDefault();
    updateJob({ id: jobId, ...formData });
  };

  // Similar form handling as create
}
```

#### Delete Hooks
- `useDeleteJob()`
- `useDeleteCustomer()`
- `useDeleteMaterial()`
- `useDeleteUser()`

**Usage pattern:**
```typescript
import { useDeleteJob } from '@/lib/hooks/useDeleteJob';

function JobItem({ job }) {
  const { mutate: deleteJob, isLoading } = useDeleteJob();

  const handleDelete = () => {
    if (window.confirm('Delete this job?')) {
      deleteJob(job.id);
    }
  };

  return (
    <div>
      <span>{job.description}</span>
      <button onClick={handleDelete} disabled={isLoading}>
        {isLoading ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

### Optimistic Updates Implementation

All mutation hooks implement optimistic UI updates:

1. **onMutate**: 
   - Cancel outgoing refetches for affected queries
   - Snapshot previous data
   - Optimistically update the cache
   - Return snapshot for potential rollback

2. **onError**:
   - Rollback to snapshotted data if mutation fails

3. **onSettled**:
   - Invalidate relevant queries to fetch fresh data from server
   - Runs whether mutation succeeds or fails

**Example from useCreateJob:**
```typescript
onMutate: async (newJob) => {
  await queryClient.cancelQueries({ queryKey: ['jobs'] });
  const previousJobs = queryClient.getQueryData(['jobs']);
  
  // Optimistically add to the end of the list
  queryClient.setQueryData(['jobs'], (old: any[] = []) => [...old, newJob]);
  
  return { previousJobs };
},
onError: (err, newJob, context) => {
  if (context?.previousJobs) {
    queryClient.setQueryData(['jobs'], context.previousJobs);
  }
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['jobs'] });
}
```

## Error Handling

### Service Layer Errors
All service functions throw raw Supabase errors, which can be caught and handled:

```typescript
try {
  const job = await getJob('job-id');
} catch (error) {
  console.error('Failed to fetch job:', error);
  // Handle specific error codes if needed
  if (error.code === 'PGRST116') {
    // Handle not found
  }
}
```

### React Query Error Handling
Query and mutation hooks provide error states:

```typescript
const { data, isError, error } = useJobs();

if (isError) {
  // error contains the thrown error from the service layer
  console.error('Query failed:', error.message);
}
```

## TypeScript Types

While the current implementation uses generic `any` types for flexibility, the service layer is designed to work with proper TypeScript types. The `Database` interface in `services.ts` defines the shape of your tables:

```typescript
interface Database {
  public: {
    Tables: {
      jobs: { Row: JobType; Insert: JobInsertType; Update: JobUpdateType };
      customers: { Row: CustomerType; Insert: CustomerInsertType; Update: CustomerUpdateType };
      // ... other tables
    };
  };
}
```

You can enhance type safety by importing and using these types in your components.

## Best Practices

### 1. Query Keys
Use consistent query keys for related data:
- Lists: `['resource']` (e.g., `['jobs']`)
- Individual items: `['resource', id]` (e.g., `['job', 'job-id']`)
- With filters: `['resource', JSON.stringify(filters)]`

### 2. Pagination
For large datasets, consider implementing pagination using Supabase's `range()` method and React Query's infinite queries.

### 3. Real-time Updates
Leverage Supabase's real-time capabilities by subscribing to changes and invalidating queries appropriately.

### 4. Error Boundaries
Use React error boundaries in addition to the global error boundary for component-specific error handling.

### 5. Loading States
Always provide loading states for better UX:
```typescript
if (isLoading) return <div>Loading...</div>;
if (isError) return <div>Error: {error.message}</div>;
```

## Security Notes

### Row-Level Security (RLS)
Ensure your Supabase tables have appropriate RLS policies enabled. The service layer uses the anon key, so all requests are subject to your RLS policies.

### Environment Variables
Never expose your Supabase service key in client-side code. This application uses only the anon key, which is safe for client use when combined with proper RLS.

## Troubleshooting

### Common Issues

1. **"Unable to connect to Supabase"**
   - Check your `.env.local` file has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Verify your Supabase project is active

2. **"Permission denied" errors**
   - Check your Supabase RLS policies
   - Ensure the anon user has appropriate permissions

3. **Stale data**
   - Verify your `staleTime` settings
   - Check if you're properly invalidating queries after mutations

4. **TypeScript errors**
   - Consider implementing specific types for your entities
   - Use the `Database` interface as a reference for correct shapes

## Future Enhancements

Consider implementing:
- Pagination and infinite scroll
- Advanced filtering and search
- Optimistic updates for batch operations
- Request deduplication
- Request cancellation for stale requests
- Offline support with local storage sync