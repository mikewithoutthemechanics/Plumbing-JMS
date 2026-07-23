# ADR 001: Testing Framework Selection

## Status
Accepted

## Context
We need to establish a testing strategy for the Plumbing JMS application. The project currently has minimal test coverage with only a basic validation test file.

## Decision
We will use Vitest as our testing framework with React Testing Library for component tests and jsdom as the test environment.

## Consequences

### Positive
- Vitest provides fast test execution with Vite integration
- Excellent TypeScript support out of the box
- React Testing Library encourages testing user behavior rather than implementation details
- jsdom provides a realistic browser-like environment for DOM testing
- Modern testing approach aligned with Next.js ecosystem

### Negative
- Learning curve for team members unfamiliar with Vitest
- Need to migrate any existing Jest tests (though currently minimal)
- Additional dependencies to manage

### Neutral
- Testing approach aligns with modern React ecosystem trends
- No immediate impact on production bundle size as dependencies are dev-only

## Related Decisions
- May consider adding end-to-end testing with Cypress or Playwright in future