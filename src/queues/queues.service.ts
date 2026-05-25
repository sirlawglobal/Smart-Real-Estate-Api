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
    try {
      this.logger.log(`Adding email job for ${data.to}`);
      return await this.emailQueue.add('sendEmail', data);
    } catch (error) {
      this.logger.error(`Failed to queue email job: ${error.message}`, error.stack);
    }
  }

  async addNotificationJob(data: any) {
    try {
      return await this.notificationQueue.add('sendNotification', data);
    } catch (error) {
      this.logger.error(`Failed to queue notification job: ${error.message}`, error.stack);
    }
  }

  async addLeadQualificationJob(data: any) {
    try {
      return await this.leadQualificationQueue.add('qualifyLead', data);
    } catch (error) {
      this.logger.error(`Failed to queue lead qualification job: ${error.message}`, error.stack);
    }
  }

  async addAiProcessingJob(data: any) {
    try {
      return await this.aiProcessingQueue.add('processAiTask', data);
    } catch (error) {
      this.logger.error(`Failed to queue AI processing job: ${error.message}`, error.stack);
    }
  }
}
