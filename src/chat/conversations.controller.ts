import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageContentDto } from './dto/send-message-content.dto';
import { ToggleAiDto } from './dto/toggle-ai.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chatService: ChatService) { }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for user' })
  getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create or find a conversation for a lead' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: User,
  ) {
    const conversation = await this.chatService.createConversation(dto.leadId, user);
    if (dto.content) {
      await this.chatService.sendMessage(
        {
          conversationId: conversation.id,
          content: dto.content,
        },
        user,
      );
    }
    return conversation;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  getConversation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getConversation(id, user);
  }

  @Get(':id/messages')
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
    @Body() dto: SendMessageContentDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.sendMessage(
      {
        conversationId: id,
        content: dto.content,
      },
      user,
    );
  }

  @Patch(':id/toggle-ai')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle AI auto-response status on/off' })
  async toggleAi(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleAiDto,
  ) {
    return this.chatService.toggleAi(id, dto.isAiActive);
  }
}
