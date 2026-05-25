import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  Res,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a message' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: User) {
    // Note: Publicly it could be sent by a buyer without token, but our spec says MVP uses JWT for all
    return this.chatService.sendMessage(dto, user);
  }

  @Public()
  @Post('webhook/whatsapp')
  @ApiOperation({ summary: 'WhatsApp Webhook (Messages)' })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Res() res: Response,
  ) {
    await this.chatService.handleWhatsAppWebhook(body);
    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }

  @Public()
  @Get('webhook/whatsapp')
  @ApiOperation({ summary: 'WhatsApp Webhook (Verification)' })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }
}
