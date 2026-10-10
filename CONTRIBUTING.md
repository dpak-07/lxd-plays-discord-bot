# Contributing Guidelines

Thank you for your interest in contributing to the All-in-One Discord Bot!

## Development Setup

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template and fill in variables:
   ```bash
   cp .env.example .env
   ```
4. Run migrations to initialize SQLite schema:
   ```bash
   npm run db:migrate
   ```
5. Run the test suite:
   ```bash
   npm test
   ```
6. Start development watch mode:
   ```bash
   npm run dev
   ```

## Pull Request Guidelines

- Ensure `npm test` passes without errors.
- Ensure `npm run build` compiles with zero TypeScript errors.
- Avoid committing `.env` or `.sqlite` files.
- Follow existing directory structure and modular service architecture.
