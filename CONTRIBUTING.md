# Contributing to DESE EA PLAN

## Workflow

1.  **Branching Strategy**
    - `main`: Production-ready code.
    - `dev`: Integration branch.
    - `feature/name`: New features.
    - `fix/issue`: Bug fixes.

2.  **Commit Messages**
    Follow [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add invoice creation endpoint`
    - `fix: correct tax calculation in finance service`
    - `docs: update architecture diagram`
    - `chore: update dependencies`

3.  **Pull Requests**
    - Create PR to `dev` branch.
    - Ensure all tests pass.
    - Request review from Tech Lead.

## Coding Standards

### General
- **Strict Typing**: Use TypeScript to its fullest. Avoid `any` at all costs.
- **Linter**: Ensure `eslint` passes before pushing.
- **Comments**: Write JSDoc for all exported functions and classes.

### Backend
- **Service Layer**: Business logic goes here, not in controllers.
- **Validation**: Use `zod` for all input validation.
- **Error Handling**: Use `try/catch` blocks and standard error responses.

### Frontend
- **Components**: Use functional components with hooks.
- **State**: Use `Zustand` for global state, `React Query` for server state.
- **UI**: Use `shadcn/ui` components from `@/components/ui`.

## Database Changes
- **Modular Schema**: Edit schema in `src/db/schema/{module}.ts`.
- **Migrations**: Run `pnpm db:generate` to create migrations.
- **Review**: Check generated SQL before applying.

## Testing
- Run `pnpm test` to execute test suite.
- Write unit tests for critical business logic (Finance, Inventory calculations).

