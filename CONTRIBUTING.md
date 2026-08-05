# Contributing to Plumbing-JMS

Thank you for considering contributing to Plumbing-JMS! We welcome contributions from the community.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check the issue tracker as you might find that you're not experiencing a unique or known issue. When you are creating a bug report, please include as many details as possible:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots or screen recordings if applicable
- Your environment (browser, OS, etc.)

### Suggesting Features
Feature requests are welcome! Please provide:
- A clear and descriptive title
- A detailed description of the feature
- Why this feature would be useful to users
- Any potential implementation considerations

### Pull Requests
1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code follows the existing code style
4. Run the test suite to ensure nothing is broken
5. Commit your changes using clear, descriptive commit messages
6. Push to your branch and submit a pull request

## Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/plumbing-jms.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Coding Standards

### Code Style
- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check for linting errors
- Run `npm run format` to automatically format code (if available)

### TypeScript
- This project is written in TypeScript
- Aim to provide proper typings for new features
- Avoid using `any` type when possible

### React & Next.js
- Follow Next.js 13+ App Router conventions
- Use React Server Components when appropriate
- Client components should be clearly marked with "use client"
- Follow React hooks rules

### Supabase & Database
- Use the service layer (`src/lib/supabase/services/`) for all database operations
- Follow the established patterns for queries and mutations
- Keep database migrations in the `/supabase` directory
- Make migrations backward compatible when possible

### Testing
- Write unit tests for utility functions and React hooks
- Use Vitest and React Testing Library for unit tests
- Consider adding end-to-end tests with Playwright for critical user flows
- Aim for meaningful test coverage, not just high percentages

## Documentation

- Update the README if your changes affect general usage
- Add JSDoc comments for complex functions
- Update API documentation if you modify the service layer or hooks
- Keep inline comments to explain why, not what

## Commit Messages

We follow conventional commit messages format:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat: add user authentication middleware

add Supabase-based authentication middleware
that protects /dashboard routes and sets
security headers
```

## Review Process

1. Once you submit your pull request, it will be reviewed by maintainers
2. You may be asked to make changes to your PR
3. Once approved, your PR will be merged
4. After merging, your branch can be deleted

## Getting Help

If you need help with your contribution:
- Check the existing documentation
- Look at similar implementations in the codebase
- Ask questions in the pull request comments
- Reach out to maintainers if you're stuck

Thank you again for contributing to Plumbing-JMS!