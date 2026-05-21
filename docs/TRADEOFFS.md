# Trade-offs

This document records the main choices made for the technical challenge and how the project would evolve in production.

## Render + Upstash Instead Of A VM

Two VM-based paths were considered:

- Oracle Cloud VM with Docker Compose, running API and Redis in separate containers.
- Google Cloud Compute Engine with Docker Compose, also separating API and Redis by container/network.

Both would work, but they add server maintenance, firewall rules, OS updates, manual Redis persistence and extra deployment steps. For this challenge, that would not prove the core product behavior better.

The final choice was:

- Render Web Service for the NestJS API and worker.
- Upstash Redis as managed Redis for BullMQ state.

This keeps the delivery easy to review while still using a real Redis service after deploy.

## API And Worker In The Same Process

For the challenge, API and worker run together in the same NestJS process. This is enough to prove:

- webhook ingestion;
- queue insertion;
- idempotency;
- retry/backoff;
- external HTTP integration;
- job status lookup.

In a production environment, the recommended split would be:

- one API service focused on request latency and validation;
- one or more worker services focused on queue throughput;
- independent autoscaling and deploys for API and workers.

## Redis Choice

Local development can use Docker Redis. The deployed environment uses Upstash Redis with TLS.

For production, the important requirement is not the provider itself, but having a durable managed Redis with:

- stable network access from the worker;
- backups/retention according to business needs;
- clear monitoring around latency, memory and connection errors.

## Missing Production Hardening

These items are intentionally outside the challenge scope, but would be next steps:

- dead-letter queue for jobs that fail after all retries;
- structured metrics for queue waiting time, processing time and failure rate;
- API authentication for webhooks;
- request signing or shared secret validation;
- rate limiting per tenant;
- separate logs/traces for API and worker;
- alerting on Redis errors and external API failure spikes.

## Render Free Tier Limitation

The public deploy is valid for review, but the Render free tier may sleep after inactivity. Jobs remain stored in Upstash Redis, but processing resumes only when the service wakes up.

For a real paid traffic automation product, the worker should run on an always-on service.
