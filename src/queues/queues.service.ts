import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectQueue('email_queue') private emailQueue: Queue,
    @InjectQueue('notification_queue') private notificationQueue: Queue,
    @InjectQueue('lead_qualification_queue') private leadQualificationQueue: Queue,
    @InjectQueue('ai_processing_queue') private aiProcessingQueue: Queue,
  ) {}

  async addEmailJob(data: any) {
    this.logger.log(`Adding email job for ${data.to}`);
    return this.emailQueue.add('sendEmail', data);
  }

  async addNotificationJob(data: any) {
    return this.notificationQueue.add('sendNotification', data);
  }

  async addLeadQualificationJob(data: any) {
    return this.leadQualificationQueue.add('qualifyLead', data);
  }

  async addAiProcessingJob(data: any) {
    return this.aiProcessingQueue.add('processAiTask', data);
  }
}
