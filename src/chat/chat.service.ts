import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';
import { LeadsService } from '../leads/leads.service';
import { CacheService } from '../cache/cache.service';
import { EVENTS } from '../events/event-names';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly leadsService: LeadsService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
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

    const message = await this.messageRepo.createAndSave({
      conversationId: conversation!.id,
      senderId: user ? user.id : null,
      content: dto.content,
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


  async getConversationMessages(id: number, _user: User): Promise<Message[]> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: { lead: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation #${id} not found`);

    return this.messageRepo.findByConversation(id);
  }

  async handleWhatsAppWebhook(payload: any) {
    this.logger.debug(`WhatsApp webhook received: ${JSON.stringify(payload)}`);
    return { success: true };
  }
}
