import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    QueuesModule,
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
