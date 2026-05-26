import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueuesService } from '../queues/queues.service';
import { EVENTS } from './event-names';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly queuesService: QueuesService) {}

  @OnEvent(EVENTS.USER_REGISTERED)
  async handleUserRegistered(payload: any) {
    this.logger.log(`User registered event for ${payload.user.email}`);
    await this.queuesService.addEmailJob({
      type: 'welcome',
      to: payload.user.email,
      data: { name: payload.user.firstName },
    });
  }

  @OnEvent(EVENTS.AUTH_FORGOT_PASSWORD)
  async handleForgotPassword(payload: any) {
    this.logger.log(`Forgot password event for ${payload.user.email}`);
    await this.queuesService.addEmailJob({
      type: 'reset-password',
      to: payload.user.email,
      data: { token: payload.token, name: payload.user.firstName },
    });
  }

  @OnEvent(EVENTS.LEAD_CREATED)
  async handleLeadCreated(payload: any) {
    this.logger.log(`Lead created event for ${payload.lead.customerName}`);
    await this.queuesService.addLeadQualificationJob({
      leadId: payload.lead.id,
      data: {
        message: payload.lead.message,
        propertyId: payload.lead.propertyId,
      },
    });
  }
}
