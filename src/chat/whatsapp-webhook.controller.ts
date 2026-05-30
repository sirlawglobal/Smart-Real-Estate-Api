import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('WhatsApp Webhook')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(private readonly chatService: ChatService) { }


  @Public()
  @Post()
  @ApiOperation({ summary: 'WhatsApp Webhook (Messages)' })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Res() res: Response,
  ) {
    await this.chatService.handleWhatsAppWebhook(body);
    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }



  @Public()
  @Get()
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
