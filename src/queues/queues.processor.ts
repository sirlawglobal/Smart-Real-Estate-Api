import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
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
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_PORT === '465',
      auth: {
        user: process.env.MAIL_USER || 'akanjiayobami71@gmail.com',
        pass: process.env.MAIL_PASSWORD || 'aewn ngao vvrn tjaa',
      },
    });
  }

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    const { type, to, data } = job.data;
    this.logger.debug(`Sending ${type} email to ${to}`);

    let subject = '';
    let html = '';
    const mailFrom = process.env.MAIL_FROM || '"FX-App" <akanjiayobami71@gmail.com>';

    if (type === 'welcome') {
      subject = 'Welcome to Real Estate AI Platform!';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Welcome to the Platform, ${data.name}!</h2>
          <p>We are excited to have you join our AI-Powered Real Estate Platform. You can now search for premium properties, chat with our AI property advisors, and track your inquiries in real time.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://smart-real-estate-api-puv0.onrender.com/docs" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Explore Properties</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #888; text-align: center;">Sent by FX-App. &copy; 2026 Real Estate AI Platform. All rights reserved.</p>
        </div>
      `;
    } else if (type === 'reset-password') {
      subject = 'Reset Your Password - Real Estate AI Platform';
      const resetLink = `https://smart-real-estate-api-puv0.onrender.com/api/v1/auth/reset-password?token=${data.token}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello ${data.name || 'User'},</p>
          <p>We received a request to reset your password. Use the token below to complete the reset process or click the button:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; color: #333;">
            ${data.token}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you did not request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #888; text-align: center;">Sent by FX-App. &copy; 2026 Real Estate AI Platform. All rights reserved.</p>
        </div>
      `;
    } else {
      subject = 'Notification from Real Estate AI Platform';
      html = `<p>${JSON.stringify(data)}</p>`;
    }

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject,
        html,
      });
      this.logger.debug(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
