import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations for user' })
  getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation messages' })
  getConversationMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getConversationMessages(id, user);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message in a conversation' })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<SendMessageDto, 'conversationId'>,
    @CurrentUser() user: User,
  ) {
    return this.chatService.sendMessage({ ...dto, conversationId: id }, user);
  }
}
