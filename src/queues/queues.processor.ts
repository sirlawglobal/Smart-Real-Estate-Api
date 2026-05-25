import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { LeadPriority } from '../leads/enums/lead.enum';

@Processor('lead_qualification_queue')
export class LeadQualificationProcessor {
  private readonly logger = new Logger(LeadQualificationProcessor.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly aiService: AiService,
  ) {}

  @Process('qualifyLead')
  async handleQualifyLead(job: Job) {
    this.logger.debug(`Processing qualification for lead ${job.data.leadId}`);
    try {
      const qualification = await this.aiService.qualifyLead(job.data.data);
      const { score, priority } = qualification.data;
      
      const priorityEnum = priority as LeadPriority || LeadPriority.MEDIUM;
      
      await this.leadsService.updateScoreAndPriority(
        job.data.leadId,
        score,
        priorityEnum,
      );
      this.logger.debug(`Lead ${job.data.leadId} scored: ${score}, priority: ${priorityEnum}`);
    } catch (error) {
      this.logger.error(`Failed to qualify lead ${job.data.leadId}`, error.stack);
    }
  }
}

@Processor('email_queue')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    this.logger.debug(`Sending ${job.data.type} email to ${job.data.to}`);
    // Simulate sending email
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.debug(`Email sent to ${job.data.to}`);
  }
}
