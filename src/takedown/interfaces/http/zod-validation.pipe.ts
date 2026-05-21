import {
  BadRequestException,
  Logger,
  type PipeTransform
} from "@nestjs/common";
import type { z } from "zod";

export class ZodValidationPipe<TSchema extends z.ZodType>
  implements PipeTransform<unknown, z.infer<TSchema>>
{
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      this.logger.warn(
        `Validation failed for paths=${result.error.issues
          .map((issue) => issue.path.map(String).join(".") || "root")
          .join(",")}`
      );

      throw new BadRequestException({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.map(String).join(".") || "root",
          code: issue.code,
          message: issue.message
        }))
      });
    }

    return result.data;
  }
}
