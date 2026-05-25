import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI' })
  @ApiBody({ schema: { example: { message: 'What properties are available in Victoria Island?' } } })
  chat(@Body('message') message: string) {
    return this.aiService.chat(message);
  }

  @Public()
  @Post('extract-intent')
  @ApiOperation({ summary: 'Extract user intent from message' })
  @ApiBody({ schema: { example: { message: 'I need a 4-bedroom duplex in Lekki under 150 million' } } })
  extractIntent(@Body('message') message: string) {
    return this.aiService.extractIntent(message);
  }

  @Public()
  @Post('recommendations')
  @ApiOperation({ summary: 'Get property recommendations based on message' })
  @ApiBody({ schema: { example: { message: 'Show me houses in Lekki under ₦150M' } } })
  recommendations(@Body('message') message: string) {
    return this.aiService.recommendations(message);
  }

  @Post('qualify-lead')
  @ApiOperation({ summary: 'Qualify a lead (Agent/Admin mostly, or automated)' })
  @ApiBody({ schema: { example: { data: { message: 'I want to buy a house now', budget: 200000000 } } } })
  qualifyLead(@Body('data') data: any) {
    return this.aiService.qualifyLead(data);
  }
}
