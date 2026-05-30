import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueuesService } from './queues.service';
import { LeadsModule } from '../leads/leads.module';
import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import { AiProcessingProcessor, LeadQualificationProcessor, EmailProcessor } from './queues.processor';

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
    forwardRef(() => ChatModule),
  ],
  providers: [QueuesService, LeadQualificationProcessor, EmailProcessor, AiProcessingProcessor],
  exports: [QueuesService, BullModule],
})
export class QueuesModule {}
