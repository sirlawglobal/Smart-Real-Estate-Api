import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends BaseRepository<Message> {
  constructor(
    @InjectRepository(Message)
    repo: Repository<Message>,
  ) {
    super(repo);
  }

  async findByConversation(conversationId: number): Promise<Message[]> {
    return this.findAll({
      where: { conversationId } as any,
      order: { createdAt: 'ASC' } as any,
    });
  }
}
