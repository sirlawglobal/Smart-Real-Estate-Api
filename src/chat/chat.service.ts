import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';
import { LeadsService } from '../leads/leads.service';
import { LeadRepository } from '../leads/repositories/lead.repository';
import { CacheService } from '../cache/cache.service';
import { QueuesService } from '../queues/queues.service';
import { EVENTS } from '../events/event-names';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly leadRepo: LeadRepository,
    private readonly leadsService: LeadsService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queuesService: QueuesService,
  ) {}

  async sendMessage(dto: SendMessageDto, user?: User): Promise<Message> {
    let conversation: Conversation | null = null;

    if (dto.conversationId) {
      conversation = await this.conversationRepo.findById(dto.conversationId);
      if (!conversation) throw new NotFoundException(`Conversation #${dto.conversationId} not found`);
    } else if (dto.leadId) {
      conversation = await this.conversationRepo.findByLead(dto.leadId);

      if (!conversation) {
        const lead = await this.leadsService.findOne(dto.leadId, user);
        conversation = await this.conversationRepo.createAndSave({ leadId: lead.id });
      }
    } else {
      throw new BadRequestException('Either conversationId or leadId must be provided');
    }

    // Agent override: Turn off AI auto-responder if the message is from an AGENT or ADMIN
    if (user && (user.role === 'AGENT' || user.role === 'ADMIN') && conversation!.isAiActive) {
      conversation!.isAiActive = false;
      await this.conversationRepo.save(conversation!);
      this.logger.log(`AI auto-response disabled for conversation #${conversation!.id} by Agent/Admin #${user.id}`);
    }

    const message = await this.messageRepo.createAndSave({
      conversationId: conversation!.id,
      senderId: user ? user.id : null,
      content: dto.content,
      isAi: false,
    });

    await this.cacheService.publish('chat:messages', {
      conversationId: conversation!.id,
      message,
    });

    this.eventEmitter.emit(EVENTS.CHAT_MESSAGE_SENT, { message });
    return message;
  }

  async getConversations(user: User): Promise<Conversation[]> {
    return this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.lead', 'lead')
      .where('lead.assignedAgentId = :userId', { userId: user.id })
      .orderBy('conversation.createdAt', 'DESC')
      .getMany();
  }

  async getConversation(id: number, _user: User): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: { lead: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation #${id} not found`);
    return conversation;
  }

  async createConversation(leadId: number, user: User): Promise<Conversation> {
    let conversation = await this.conversationRepo.findByLead(leadId);
    if (!conversation) {
      const lead = await this.leadsService.findOne(leadId, user);
      conversation = await this.conversationRepo.createAndSave({ leadId: lead.id });
    }
    return conversation;
  }

  async getConversationMessages(id: number, _user?: User): Promise<Message[]> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: { lead: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation #${id} not found`);

    return this.messageRepo.findByConversation(id);
  }

  async handleWhatsAppWebhook(payload: any) {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messageData = value?.messages?.[0];
      const contactData = value?.contacts?.[0];

      if (!messageData || messageData.type !== 'text') {
        return { success: true };
      }

      const customerPhone = `+${messageData.from}`;
      const customerName = contactData?.profile?.name || 'WhatsApp Guest';
      const messageContent = messageData.text.body;

      // Find or create lead
      let lead = await this.leadRepo.findByWhere({ customerPhone } as any);
      if (!lead) {
        lead = await this.leadRepo.createAndSave({
          customerName,
          customerPhone,
          customerEmail: `${messageData.from}@whatsapp.temp`,
          message: messageContent,
        });
      }

      // Find or create conversation
      let conversation = await this.conversationRepo.findByWhere({ leadId: lead.id } as any);
      if (!conversation) {
        conversation = await this.conversationRepo.createAndSave({ leadId: lead.id });
      }

      // Save customer message
      const savedMessage = await this.messageRepo.createAndSave({
        conversationId: conversation.id,
        senderId: null,
        content: messageContent,
        isAi: false,
      });

      // Publish message locally via Redis -> WebSockets
      await this.cacheService.publish('chat:messages', {
        conversationId: conversation.id,
        message: savedMessage,
      });

      // Queue AI auto-response if active
      if (conversation.isAiActive) {
        this.logger.log(`Queueing AI auto-response for conversation #${conversation.id}`);
        await this.queuesService.addAiProcessingJob({
          conversationId: conversation.id,
          messageContent: messageContent,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling WhatsApp Webhook: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  async sendWhatsAppReply(conversationId: number, content: string, agentUser?: User) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { lead: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation #${conversationId} not found`);

    const customerPhone = conversation.lead.customerPhone;

    // Save message locally
    const savedMessage = await this.messageRepo.createAndSave({
      conversationId,
      senderId: agentUser ? agentUser.id : null,
      content,
      isAi: !agentUser,
    });

    // Publish locally
    await this.cacheService.publish('chat:messages', {
      conversationId,
      message: savedMessage,
    });

    // Send via Meta API if it's a WhatsApp thread
    if (customerPhone && customerPhone.startsWith('+')) {
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const cleanPhone = customerPhone.replace('+', '');

      if (phoneId && accessToken && accessToken !== 'your-whatsapp-access-token') {
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
        try {
          await axios.post(
            url,
            {
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: content },
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );
          this.logger.log(`WhatsApp message sent successfully to ${cleanPhone}`);
        } catch (error) {
          this.logger.error(
            `Failed to send message via Meta API to ${cleanPhone}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`,
          );
        }
      } else {
        this.logger.warn(`WhatsApp credentials not configured; skipping external dispatch to ${cleanPhone}`);
      }
    }

    return savedMessage;
  }

  async toggleAi(id: number, isAiActive: boolean): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException(`Conversation #${id} not found`);

    conversation.isAiActive = isAiActive;
    return this.conversationRepo.save(conversation);
  }
}
