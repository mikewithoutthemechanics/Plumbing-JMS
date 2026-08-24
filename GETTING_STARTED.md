# Plumbing-JMS - Getting Started Guide

## Overview

Plumbing-JMS is a Next.js 13+ application with React Server Components, Supabase backend, and React Query for state management. This guide will help you get the project up and running locally.

## Prerequisites

- Node.js 18.x or later
- npm or yarn or pnpm
- A Supabase account and project
- Git

## Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Plumbing-JMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with the following variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   > You can find these values in your Supabase project settings under **Settings > API**.

4. **Set up the Supabase database**

   > ⚠️ **IMPORTANT — use the migrations, not the root SQL files.**
   > The legacy root-level scripts (`setup-database.sql`, `supabase_setup.sql`,
   > `supabase_setup_additions.sql`, `final_setup.sql`) are **outdated**: they create
   > the schema but contain **no Row Level Security policies**. Do NOT run them on a
   > fresh project.

   The canonical schema lives in versioned migrations under `supabase/migrations/`.
   Apply them in filename order with the Supabase CLI:

   ```bash
   npm install -g supabase          # once
   supabase login                    # once (browser)
   supabase link --project-ref <your-project-ref>
   supabase db push                  # applies every migration in order
   ```

   This includes the security-critical migrations:
   - `20260820160000_enable_rls_security.sql` — enables RLS + base policies
   - `20260820170000_harden_rls.sql` — replaces permissive policies with role-checked ones

   Verify after pushing: every public table must show RLS enabled
   (Supabase Dashboard → Table Editor → each table → "RLS enabled" badge).

## Development

To start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── app/                 # Next.js 13+ App Router
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── dashboard/       # Protected dashboard routes
│   └── error.tsx        # Global error boundary
├── components/          # Reusable React components
├── lib/                 # Utility functions and services
│   ├── supabase/        # Supabase client and service layer
│   └── hooks/           # React Query hooks
├── middleware.ts        # Authentication and security middleware
└── types/               # TypeScript type definitions
```

## Key Features Implemented

### Authentication & Security (P0)
- Server-side authentication middleware using Supabase
- Route protection for `/dashboard` paths
- Security headers (X-Frame-Options, Referrer-Policy, CSP, HSTS)

### Error Handling (P0)
- Global error boundary (`src/app/error.tsx`)
- Graceful error recovery with retry button

### Data Layer (P1)
- Service layer abstraction (`src/lib/supabase/services.ts`)
  - Generic CRUD operations for any Supabase table
  - Specific exports for jobs, customers, materials, users tables
- React Query hooks for data fetching:
  - `useJobs(filters)` - Fetch jobs with filters
  - `useCustomer(id)` - Fetch single customer
  - `useMaterials(filters)` - Fetch materials with filters
  - `useUser(id)` - Fetch single user
  - `useJob(id)` - Fetch single job

### Data Mutations (P2)
- All mutation hooks include optimistic updates for instant UI feedback:
  - Create: `useCreateJob`, `useCreateCustomer`, etc.
  - Update: `useUpdateJob`, `useUpdateCustomer`, etc.
  - Delete: `useDeleteJob`, `useDeleteCustomer`, etc.
  - Automatic cache invalidation and rollback on error

## Available Scripts

- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server
- `lint` - Run ESLint
- `test` - Run Vitest unit tests

## Database Schema

The application uses the following core tables (created via Supabase migrations):

- **jobs**: Plumbing jobs/work orders
- **customers**: Customer information
- **materials**: Inventory/materials tracking
- **users**: Application users/authentication

Refer to the SQL files in `/supabase/` for the complete schema.

## API Documentation

All data access goes through the service layer in `src/lib/supabase/services.ts`:

### Query Functions
- `getRows(table, filters)` - Get multiple rows with filters
- `getRowById(table, id)` - Get single row by ID
- `insertRow(table, data)` - Insert new row
- `updateRow(table, id, data)` - Update row by ID
- `deleteRow(table, id)` - Delete row by ID

### Specific Exports
Each table has dedicated functions:
- Jobs: `getJobs`, `getJob`, `createJob`, `updateJob`, `deleteJob`
- Customers: `getCustomers`, `getCustomer`, `createCustomer`, etc.
- Materials: `getMaterials`, `getMaterial`, `createMaterial`, etc.
- Users: `getUsers`, `getUser`, `createUser`, etc.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.