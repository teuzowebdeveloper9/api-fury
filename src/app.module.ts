import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { AppConfigService } from "./config/app-config.service";
import { EnvironmentModule } from "./config/environment.module";

@Module({
  imports: [
    NestConfigModule.forRoot({
      cache: true,
      isGlobal: true
    }),
    EnvironmentModule,
    BullModule.forRootAsync({
      imports: [EnvironmentModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: config.redisConnection
      })
    })
  ]
})
export class AppModule {}
