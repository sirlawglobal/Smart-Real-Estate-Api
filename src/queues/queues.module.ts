import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueuesService } from './queues.service';
import { LeadQualificationProcessor, EmailProcessor } from './queues.processor';
import { LeadsModule } from '../leads/leads.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email_queue' },
      { name: 'notification_queue' },
      { name: 'lead_qualification_queue' },
      { name: 'ai_processing_queue' },
    ),
    forwardRef(() => LeadsModule),
    forwardRef(() => AiModule),
  ],
  providers: [QueuesService, LeadQualificationProcessor, EmailProcessor],
  exports: [QueuesService, BullModule],
})
export class QueuesModule {}
