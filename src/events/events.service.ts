import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueuesService } from '../queues/queues.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly queuesService: QueuesService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: any) {
    this.logger.log(`User registered event for ${payload.user.email}`);
    await this.queuesService.addEmailJob({
      type: 'welcome',
      to: payload.user.email,
      data: { name: payload.user.firstName },
    });
  }

  @OnEvent('auth.forgot-password')
  async handleForgotPassword(payload: any) {
    await this.queuesService.addEmailJob({
      type: 'reset-password',
      to: payload.user.email,
      data: { token: payload.token, name: payload.user.firstName },
    });
  }

  @OnEvent('lead.created')
  async handleLeadCreated(payload: any) {
    this.logger.log(`Lead created event for ${payload.lead.customerName}`);
    // Queue AI qualification for this lead
    await this.queuesService.addLeadQualificationJob({
      leadId: payload.lead.id,
      data: {
        message: payload.lead.message,
        propertyId: payload.lead.propertyId,
      },
    });
  }
}
