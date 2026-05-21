# CLAUDE.md

## Required Architecture

This project uses NestJS with clean architecture boundaries inside the `takedown` feature.

- Domain: business types and invariants only.
- Application: use cases and ports for queue and Meta API simulation.
- Infrastructure: BullMQ queue adapter, Redis-backed behavior, config, and outbound HTTP.
- Interfaces: HTTP controllers, Zod pipes, and BullMQ processors.

Do not import NestJS, BullMQ, Redis, or HTTP client details into the domain layer.

## Feature Workflow

1. Add or update domain/application behavior first.
2. Define a small port if the use case needs an external system.
3. Implement adapters in infrastructure.
4. Wire adapters through `TakedownModule`.
5. Expose delivery through controllers or processors in interfaces.
6. Add Jest tests around application/domain behavior.
7. Update README when behavior, commands, or environment variables change.

## Verification

Run these before considering a change complete:

```bash
npm run typecheck
npm test
npm run build
```

Run `npm run lint` when lint dependencies are installed and the change touches TypeScript source.

## Security Rules

- Do not commit `.env`.
- Do not add real tokens, API keys, Redis credentials, or private URLs to source files.
- Do not log full webhook payloads.
- Keep idempotency IDs deterministic and non-revealing.
