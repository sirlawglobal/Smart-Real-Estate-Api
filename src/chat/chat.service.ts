import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';
import { LeadsService } from '../leads/leads.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly leadsService: LeadsService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendMessage(dto: SendMessageDto, user?: User): Promise<Message> {
    let conversation: Conversation | null = null;

    if (dto.conversationId) {
      conversation = await this.conversationRepo.findOne({
        where: { id: dto.conversationId },
      });
      if (!conversation) {
        throw new NotFoundException(`Conversation #${dto.conversationId} not found`);
      }
    } else if (dto.leadId) {
      conversation = await this.conversationRepo.findOne({
        where: { leadId: dto.leadId },
      });

      if (!conversation) {
        // Create new conversation for this lead
        const lead = await this.leadsService.findOne(dto.leadId, user); // Assuming agent creates it
        conversation = this.conversationRepo.create({ leadId: lead.id });
        conversation = await this.conversationRepo.save(conversation);
      }
    } else {
      throw new BadRequestException('Either conversationId or leadId must be provided');
    }

    const message = this.messageRepo.create({
      conversationId: conversation!.id,
      senderId: user ? user.id : null,
      content: dto.content,
    });

    const saved = await this.messageRepo.save(message);

    // Publish to Redis for WebSocket
    await this.cacheService.publish('chat:messages', {
      conversationId: conversation.id,
      message: saved,
    });

    this.eventEmitter.emit('chat.message_sent', { message: saved });

    return saved;
  }

  async getConversations(user: User): Promise<Conversation[]> {
    // Basic implementation: get conversations for leads assigned to this user
    return this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.lead', 'lead')
      .where('lead.assignedAgentId = :userId', { userId: user.id })
      .orderBy('conversation.createdAt', 'DESC')
      .getMany();
  }

  async getConversationMessages(id: number, user: User): Promise<Message[]> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: { lead: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation #${id} not found`);
    }

    // Add access control check if needed based on lead assignment

    return this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
  }

  async handleWhatsAppWebhook(payload: any) {
    // Process WhatsApp webhook payload
    // Extract sender phone, message content
    // Find or create lead based on phone number
    // Find or create conversation
    // Save message
    // return status
    
    // Simplistic mock implementation
    console.log('Received WhatsApp Webhook:', JSON.stringify(payload));
    return { success: true };
  }
}
