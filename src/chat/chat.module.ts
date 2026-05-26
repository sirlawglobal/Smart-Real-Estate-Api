import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationsController } from './conversations.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    LeadsModule,
  ],
  controllers: [ChatController, ConversationsController],
  providers: [ChatService, ConversationRepository, MessageRepository],
  exports: [ChatService],
})
export class ChatModule {}
