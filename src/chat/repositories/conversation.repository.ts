import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Conversation } from '../entities/conversation.entity';

@Injectable()
export class ConversationRepository extends BaseRepository<Conversation> {
  constructor(
    @InjectRepository(Conversation)
    repo: Repository<Conversation>,
  ) {
    super(repo);
  }

  async findByLead(leadId: number): Promise<Conversation | null> {
    return this.findByWhere({ leadId } as any);
  }
}
