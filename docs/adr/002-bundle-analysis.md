# ADR 002: Bundle Analysis Setup

## Status
Accepted

## Context
The Plumbing JMS application is a Next.js 16.2.9 app using Turbopack for bundling with a PWA setup via `next-pwa`. Prior to this change there was no way to inspect the production bundle composition, making it difficult to identify large dependencies, duplicate modules, or optimization opportunities (code splitting, dynamic imports). The `IMPROVEMENT_PLAN.md` Phase 4 (Performance & Monitoring) explicitly calls for bundle analysis as the first step toward performance budgets and bundle optimization.

We needed a tool that integrates with the existing Next.js config without disrupting the PWA wrapper or the normal dev/build workflow.

## Decision
We will use `@next/bundle-analyzer` (v16.2.11), the official Next.js wrapper around `webpack-bundle-analyzer`. It is integrated as a conditional wrapper in `next.config.ts` that is only active when the `ANALYZE` environment variable is set to `true`.

A dedicated npm script `build:analyze` (`ANALYZE=true next build`) is provided so the analyzer report can be generated on demand without affecting regular builds.

## Consequences

### Positive
- Visual treemap of the production bundle reveals the largest modules and duplicate dependencies
- Zero impact on normal `dev` and `build` workflows — the analyzer is opt-in via the `ANALYZE` env var
- Official, first-party integration that composes cleanly with the existing `withPWA` wrapper
- Lays the groundwork for later phases: bundle size budgets in CI, targeted code splitting, and dynamic imports

### Negative
- Bundle analysis requires a webpack-based build; while `@next/bundle-analyzer` works with the default web bundler, the Turbopack path (`turbopack: {}`) is not analyzed by webpack-bundle-analyzer, so the report reflects the webpack build output rather than the Turbopack build
- Adds `@next/bundle-analyzer` and its transitive `webpack-bundle-analyzer` dependency to `devDependencies`
- The analyzer build is slower than a regular production build, so it should be run on demand rather than in CI by default

### Neutral
- Bundle reports are generated under the project root and consumed locally; no production runtime cost since the dependency is dev-only

## Related Decisions
- Builds on [[001-testing-framework]] (Vitest) — both are Phase 1 and Phase 4 dev-tooling additions that do not affect the production bundle
- Future ADRs may cover performance budgets in CI and code-splitting strategy once baseline bundle sizes are measured
