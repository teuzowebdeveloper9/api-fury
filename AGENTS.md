# AGENTS.md

## Project Context

- Project: FURY Click Hero API.
- Stack: Node.js, TypeScript, NestJS, Zod, BullMQ, Redis, Jest.
- Purpose: receive violation webhooks, validate payloads, enqueue idempotent takedown jobs, and expose job status.
- Architecture: NestJS modules with clean architecture boundaries under `src/takedown`.

## Architecture Rules

- `domain` contains business types and must not import Nest, BullMQ, HTTP clients, Redis, or config.
- `application` contains use cases and ports. Keep it framework-light and depend on interfaces.
- `infrastructure` implements ports for BullMQ, Redis-backed queues, config, and outbound HTTP.
- `interfaces` owns controllers, pipes, and queue processors.
- Dependency direction must stay: `interfaces -> application -> domain` and `infrastructure -> application`.

## Commands

- Install: `npm install`
- Redis local: `docker compose up -d redis`
- Dev API and worker: `npm run start:dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Coverage: `npm run test:coverage`

## Testing

- Add or update Jest tests for domain/application behavior.
- Mock infrastructure through ports, not concrete adapters.
- Keep external HTTP calls out of unit tests.
- Run `npm test` and `npm run typecheck` before declaring work complete.

## Security

- Never commit `.env` or real API keys. Use `.env.example` for documentation only.
- Do not log webhook payloads, tenant identifiers, ad identifiers, or secrets.
- Keep generated job IDs hashed so URLs and logs do not expose raw `adId` or `tenantId`.
- Treat outbound HTTP failures and timeouts as controlled retryable failures.

## Change Discipline

- Read existing files before editing.
- Preserve user changes and avoid unrelated refactors.
- Update `README.md` if commands, environment variables, architecture, or endpoint behavior changes.
