import { Injectable } from "@nestjs/common";
import type { ConnectionOptions } from "bullmq";
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  PORT: positiveInteger.default(3000),
  HOST: z.string().min(1).default("0.0.0.0"),
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: positiveInteger.default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: booleanFromEnv,
  META_API_SIMULATION_URL: z
    .string()
    .url()
    .default("https://jsonplaceholder.typicode.com/posts/1"),
  META_API_TIMEOUT_MS: positiveInteger.default(3000),
  TAKEDOWN_JOB_ATTEMPTS: positiveInteger.default(3),
  TAKEDOWN_JOB_BACKOFF_MS: positiveInteger.default(1000)
});

type EnvConfig = z.infer<typeof envSchema>;

@Injectable()
export class AppConfigService {
  private readonly env: EnvConfig;

  constructor() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid environment configuration: ${details}`);
    }

    this.env = parsed.data;
  }

  get port(): number {
    return this.env.PORT;
  }

  get host(): string {
    return this.env.HOST;
  }

  get redisConnection(): ConnectionOptions {
    const connection: ConnectionOptions = {
      host: this.env.REDIS_HOST,
      port: this.env.REDIS_PORT,
      maxRetriesPerRequest: null
    };

    if (this.env.REDIS_PASSWORD && this.env.REDIS_PASSWORD.length > 0) {
      connection.password = this.env.REDIS_PASSWORD;
    }

    if (this.env.REDIS_TLS) {
      connection.tls = {};
    }

    return connection;
  }

  get metaApiSimulationUrl(): string {
    return this.env.META_API_SIMULATION_URL;
  }

  get metaApiTimeoutMs(): number {
    return this.env.META_API_TIMEOUT_MS;
  }

  get takedownJobAttempts(): number {
    return this.env.TAKEDOWN_JOB_ATTEMPTS;
  }

  get takedownJobBackoffMs(): number {
    return this.env.TAKEDOWN_JOB_BACKOFF_MS;
  }
}
