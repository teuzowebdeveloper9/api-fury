# Architecture

This project is a small NestJS API built around one feature: receiving ad violation webhooks and enqueueing takedown jobs.

## Runtime Flow

1. `POST /webhook/violation` receives the violation payload.
2. `ZodValidationPipe` validates the request body with `violationWebhookSchema`.
3. `ReportViolationUseCase` creates a deterministic job id from `tenantId + adId`.
4. `BullMqTakedownQueueAdapter` enqueues the job in BullMQ/Redis.
5. `TakedownProcessor` consumes the queue and runs `ProcessTakedownUseCase`.
6. `JsonPlaceholderMetaAdsGateway` calls `https://jsonplaceholder.typicode.com/posts/1` as the Meta API simulation.
7. If the job exhausts all retry attempts, `TakedownProcessor` records it in the `takedown-dead-letter` queue.
8. `GET /jobs/:id` reads the current BullMQ job state and returns a stable response shape.

## Layers

```text
interfaces -> application -> domain
infrastructure -> application
```

- `domain`: pure business types and enums.
- `application`: use cases and ports. It does not depend on NestJS, BullMQ, Redis or HTTP clients.
- `infrastructure`: adapters for BullMQ and the external HTTP call.
- `interfaces`: HTTP controllers, validation pipe and BullMQ processor.

This keeps the high-value rules testable without starting Redis or making real HTTP calls.

## Idempotency

The same `adId + tenantId` must not generate two simultaneous takedown jobs. The API solves this with a deterministic job id:

```text
takedown-${sha256(tenantId + ":" + adId)}
```

The raw `adId` and `tenantId` are not exposed in the URL or job id, but the queue can still identify duplicates.

## Worker And Retry

The worker treats these scenarios explicitly:

- HTTP `2xx`: successful takedown simulation.
- HTTP `4xx/5xx`: controlled failure, allowing BullMQ retry.
- Timeout/network error: controlled failure, allowing BullMQ retry.

Retries are configured with exponential backoff and a maximum of 3 attempts by default.

After the final failed attempt, the worker records a dead-letter job in `takedown-dead-letter` with the original job id, source queue, attempt count, error message, failure timestamp and original job payload. This keeps failed jobs inspectable or replayable later without changing the public HTTP contract.

## Operational Endpoints

- `GET /`: human-friendly JSON with the available endpoints.
- `GET /health`: validates API process, Redis `PING`, and external API URL configuration.
- `GET /docs`: Scalar documentation from OpenAPI.
- `GET /openapi.json`: OpenAPI contract used by Scalar.
