import { Injectable } from "@nestjs/common";

import { AppConfigService } from "../../../config/app-config.service";
import type { MetaAdsGateway } from "../../application/ports/meta-ads-gateway.port";
import type {
  TakedownJobData,
  TakedownJobResult
} from "../../application/ports/takedown-queue.port";

class MetaApiSimulationError extends Error {}

class MetaApiHttpError extends MetaApiSimulationError {
  constructor(status: number) {
    super(`Meta API simulation failed with HTTP status ${status}`);
  }
}

class MetaApiTimeoutError extends MetaApiSimulationError {
  constructor(timeoutMs: number) {
    super(`Meta API simulation timed out after ${timeoutMs}ms`);
  }
}

class MetaApiNetworkError extends MetaApiSimulationError {
  constructor(message: string) {
    super(`Meta API simulation network error: ${message}`);
  }
}

@Injectable()
export class JsonPlaceholderMetaAdsGateway implements MetaAdsGateway {
  constructor(private readonly config: AppConfigService) {}

  async requestTakedown(_job: TakedownJobData): Promise<TakedownJobResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.metaApiTimeoutMs
    );

    try {
      const response = await fetch(this.config.metaApiSimulationUrl, {
        method: "GET",
        headers: {
          accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new MetaApiHttpError(response.status);
      }

      return {
        ok: true,
        externalStatus: response.status,
        processedAt: new Date().toISOString()
      };
    } catch (error: unknown) {
      if (error instanceof MetaApiSimulationError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new MetaApiTimeoutError(this.config.metaApiTimeoutMs);
      }

      throw new MetaApiNetworkError(getErrorMessage(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "unknown error";
}
