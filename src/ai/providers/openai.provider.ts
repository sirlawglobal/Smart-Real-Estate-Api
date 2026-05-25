import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AiProvider } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private openai: OpenAI;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  async chat(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.openaiModel') || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI Chat Error:', error);
      throw error;
    }
  }

  async extractIntent(message: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.openaiModel') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract intent from the user message. Output must be raw JSON with no markdown wrapping. Keys should be: location (string), budget (number), bedrooms (number), propertyType (string). If a value is not found, omit the key or set to null. Example: {"location":"Lekki","budget":150000000,"bedrooms":4,"propertyType":"duplex"}`,
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.logger.error('OpenAI Extract Intent Error:', error);
      throw error;
    }
  }

  async qualifyLead(data: any): Promise<{ score: number; priority: string }> {
    try {
      const prompt = `Qualify this lead based on the following data: ${JSON.stringify(data)}.
      Return JSON with 'score' (0-100) and 'priority' (LOW, MEDIUM, HOT).
      - HOT: Budget is specified and realistic, looking to buy soon, high engagement.
      - MEDIUM: Interest shown, but missing budget or unclear timeline.
      - LOW: Just browsing, generic questions.`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.openaiModel') || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(response.choices[0].message.content || '{"score": 50, "priority": "MEDIUM"}');
    } catch (error) {
      this.logger.error('OpenAI Qualify Lead Error:', error);
      return { score: 50, priority: 'MEDIUM' };
    }
  }
}
