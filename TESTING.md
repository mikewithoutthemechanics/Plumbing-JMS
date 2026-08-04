# Testing Strategy for Plumbing JMS

## Overview
This document outlines the testing strategy for the Plumbing JMS application, covering unit, integration, and end-to-end testing approaches.

## Test Suite Structure

```
tests/
├── unit/           # Unit tests for utilities, helpers, etc.
├──├── integration/    # Integration tests for API routes, complex interactions
├── e2e/            # End-to-end tests with Playwright
└── fixtures/       # Test data and mocks
```

Source code tests are colocated with the source files using `.test.ts` or `.test.tsx` extensions.

## Testing Tools

- **Unit/Integration Tests**: Vitest + React Testing Library
- **End-to-End Tests**: Playwright
- **Assertions**: Vitest's expect + Jest DOM matchers
- **Mocking**: Vitest's vi.mock, vi.spyOn
- **Test Data**: Factory functions and fixtures

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit/integration tests
npm run test:unit

# Run only e2e tests
npm run test:e2e

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npx vitest run src/lib/validation.test.ts
```

## Writing Tests

### Unit Tests
Place unit tests either:
1. Next to the file being tested: `utils/helpers.test.ts`
2. In a `tests/unit` directory: `tests/unit/helpers.test.ts`

### Component Tests
Use React Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  test('renders with correct label', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Custom Hooks Tests
Test custom hooks by rendering them in a wrapper component:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  test('initializes with zero', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current).toBe(0);
  });

  test('increments when increment is called', () => {
    const { result } = renderHook(() => useCounter());
    act(() => {
      result.current[1](); // Assuming [state, setState] pattern
    });
    expect(result.current[0]).toBe(1);
  });
});
```

### API Route Tests
Test API routes by mocking Next.js request/response objects:

```typescript
import { describe, expect, test, vi } from 'vitest';
import { POST } from './route';
import { NextRequest, NextResponse } from 'next/server';

describe('POST /api/endpoint', () => {
  test('returns success for valid input', async () => {
    const req = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ valid: 'data' })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

## Mocking Strategies

### Mocking Supabase
```typescript
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  }))
}));
```

### Mocking Date and Time
```typescript
vi.useFakeTimers();
// ... code that uses Date.now() or timers
vi.advanceTimersByTime(1000); // Advance 1 second
// ... assertions
vi.useRealTimers();
```

## Best Practices

1. **Test Behavior, Not Implementation**
   Focus on what the code does, not how it does it internally.

2. **Keep Tests Independent**
   Each test should be able to run in isolation without side effects.

3. **Use Descriptive Test Names**
   Clearly state what is being tested and the expected outcome.

4. **Test Edge Cases**
   Don't just test the happy path - test error conditions, empty states, etc.

5. **Mock External Dependencies**
   Don't make real network calls or database queries in unit tests.

6. **Keep Tests Fast**
   Avoid unnecessary waits or complex setup in tests.

7. **Test Coverage Goals**
   - Statements: 80%+
   - Branches: 70%+
   - Functions: 85%+
   - Lines: 80%+

## Continuous Integration

Tests run automatically in CI on:
- Pull requests against main branch
- Pushes to main branch
- Nightly builds (full test suite)

## Adding Tests for New Features

When implementing new features:
1. Write failing tests first (TDD approach) or alongside implementation
2. Ensure tests cover all acceptance criteria
3. Update existing tests if behavior changes
4. Remove obsolete tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)