# ADR 0001: Use Supabase as the Backend

## Status
Accepted

## Context
We need to choose a backend solution for the Plumbing JMS application. The application requires:
- Authentication and authorization
- Real-time database capabilities
- File storage (for attachments, etc.)
- API endpoints for CRUD operations
- Scalability and ease of deployment

## Decision
We will use Supabase as the backend-as-a-service (BaaS) solution.

## Consequences
### Pros
- Provides a PostgreSQL database with real-time capabilities
- Built-in authentication (email/password, magic link, social login)
- File storage via S3-compatible API
- Auto-generated RESTful API (PostgREST) and GraphQL endpoint
- Easy to set up and deploy (can be self-hosted or use Supabase cloud)
- Open source and avoids vendor lock-in to a large extent
- Integrates well with Next.js (via @supabase/supabase-js and @supabase/ssr)

### Cons
- Less control over the infrastructure compared to a custom backend
- Learning curve for PostgREST and Supabase-specific features
- Potential limitations on complex queries or business logic that might require edge functions

## Alternatives Considered
1. **Custom Node.js/Express API with PostgreSQL**
   - Pros: Full control, flexibility
   - Cons: More development time, need to handle auth, scaling, deployment manually

2. **Firebase**
   - Pros: Similar BaaS offering, good client libraries
   - Cons: Uses NoSQL (Firestore) which may not be ideal for relational data, vendor lock-in

3. **AWS Amplify**
   - Pros: Integrates well with AWS services
   - Cons: Can be complex, cost prediction harder

## Implementation Status
Implemented: The application currently uses Supabase for authentication, database, and storage.

## Related Decisions
- ADR 0002: Use Next.js App Router for routing and server components
- ADR 0003: Use Zustand for state management (if applicable, adjust as needed)

## Notes
We may need to write some custom Edge Functions (via Supabase Functions) for complex business logic that cannot be handled by row-level security or database triggers.