import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ChatService } from '../chat/chat.service';
import { LeadPriority } from '../leads/enums/lead.enum';

@Processor('lead_qualification_queue')
export class LeadQualificationProcessor {
  private readonly logger = new Logger(LeadQualificationProcessor.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly aiService: AiService,
  ) { }

  @Process('qualifyLead')
  async handleQualifyLead(job: Job) {
    this.logger.log(`Processing qualification for lead ${job.data.leadId}`);
    try {
      const qualification = await this.aiService.qualifyLead(job.data.data);
      const { score, priority } = qualification.data;

      const priorityEnum = priority as LeadPriority || LeadPriority.MEDIUM;

      await this.leadsService.updateScoreAndPriority(
        job.data.leadId,
        score,
        priorityEnum,
      );
      this.logger.log(`Lead ${job.data.leadId} scored: ${score}, priority: ${priorityEnum}`);
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
    // Fix #2: Fail fast at startup if email credentials are not configured.
    // Never fall back to hardcoded credentials in source code.
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASSWORD;

    if (!user || !pass) {
      throw new Error(
        'MAIL_USER and MAIL_PASSWORD environment variables are required. ' +
        'Email queue processor cannot start without valid SMTP credentials.',
      );
    }

    // Typed as `any` because `socketOptions` is a valid nodemailer runtime field
    // passed to net.createConnection(), but is not reflected in @types/nodemailer.
    // family: 4 forces IPv4 to avoid ENETUNREACH when smtp.gmail.com resolves
    // to an IPv6 address that the host network cannot reach.
    const transportOptions: any = {
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_PORT === '465',
      auth: { user, pass },
      socketOptions: { family: 4 },
    };
    this.transporter = nodemailer.createTransport(transportOptions);
  }

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    const { type, to, data } = job.data;
    this.logger.log(`Sending ${type} email to ${to}`);

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
      if (process.env.MAIL_HOST === 'smtp-relay.brevo.com') {
        const pass = process.env.MAIL_PASSWORD;
        const fromMatch = mailFrom.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>/);
        const sender = fromMatch
          ? { name: fromMatch[1] || 'FX-App', email: fromMatch[2] }
          : { name: 'FX-App', email: mailFrom };

        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender,
            to: [{ email: to }],
            subject,
            htmlContent: html,
          },
          {
            headers: {
              'accept': 'application/json',
              'api-key': pass,
              'content-type': 'application/json',
            },
          }
        );
        this.logger.log(`Email sent successfully via Brevo REST API to ${to}. Response: ${JSON.stringify(response.data)}`);
      } else {
        await this.transporter.sendMail({
          from: mailFrom,
          to,
          subject,
          html,
        });
        this.logger.log(`Email sent successfully to ${to}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}

@Processor('ai_processing_queue')
export class AiProcessingProcessor {
  private readonly logger = new Logger(AiProcessingProcessor.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly aiService: AiService,
  ) {}

  @Process('processAiTask')
  async handleAiTask(job: Job) {
    const { conversationId, messageContent } = job.data;
    this.logger.log(`Processing AI auto-respond for conversation #${conversationId}`);

    try {
      // 1. Fetch conversation history (for memory)
      const messages = await this.chatService.getConversationMessages(conversationId, undefined);
      // Keep last 10 messages to avoid token overflow
      const recentMessages = messages.slice(-10);

      const formattedHistory = recentMessages
        .map((m) => {
          const sender = m.senderId ? 'Agent' : m.isAi ? 'Temple AI' : 'Customer';
          return `${sender}: ${m.content}`;
        })
        .join('\n');

      // 2. Fetch RAG recommendations based on user message
      const recommendationsResult = await this.aiService.recommendations(messageContent);
      const recommendations = recommendationsResult.recommendations || [];

      const formattedProps = recommendations
        .map(
          (p) =>
            `- Title: ${p.title}\n  Price: ₦${p.price.toLocaleString()}\n  Location: ${p.city}, ${p.state}\n  Bedrooms: ${p.bedrooms}\n  Bathrooms: ${p.bathrooms}\n  Details: ${p.description}`,
        )
        .join('\n\n');

      // 3. Format prompt for the LLM
      const systemPrompt = `You are "Temple AI", a helpful and polite AI assistant for a premium real estate agency.
Your goal is to answer the customer's questions, guide them to properties that match their interests from the list below, and try to schedule a viewing or request their email/phone if they are a guest.

Guidelines:
- Only discuss properties from the "Matching Properties" list provided below. Do not invent properties, prices, or locations.
- If no matching properties are provided, politely ask them for their budget, preferred location, and bedroom count to search the database.
- Keep your replies concise and friendly (2-3 sentences max).

Matching Properties:
${formattedProps || 'No properties currently match this search.'}

Conversation History:
${formattedHistory}`;

      const userMessage = `${systemPrompt}\n\nCustomer: ${messageContent}\nTemple AI:`;

      // 4. Generate response
      const chatResponse = await this.aiService.chat(userMessage);
      const reply = chatResponse.response.trim();

      // 5. Deliver response
      await this.chatService.sendWhatsAppReply(conversationId, reply);
      this.logger.log(`AI auto-response delivered to conversation #${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to process AI auto-response for conversation #${conversationId}: ${error.message}`, error.stack);
    }
  }
}
