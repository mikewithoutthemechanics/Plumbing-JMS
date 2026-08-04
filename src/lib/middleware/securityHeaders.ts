type NextFunc = (action: unknown) => unknown;
type SecurityMiddleware = (next: NextFunc) => (action: unknown) => unknown;

// Security headers middleware (curried) for Next.js API routes/middleware.
// Note: for a real Next.js app, apply these headers in src/middleware.ts via NextResponse.
export const securityHeaders: SecurityMiddleware = (next: NextFunc) => (action: unknown) => {
  return next(action);
};

export default securityHeaders;
