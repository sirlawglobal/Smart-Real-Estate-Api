import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProvider } from './ai-provider.interface';

/**
 * GroqProvider — uses Groq's OpenAI-compatible API with Llama 3.3 70B.
 * Free tier: 14,400 requests/day, 30 req/min.
 * Docs: https://console.groq.com/docs/openai
 */
@Injectable()
export class GroqProvider implements AiProvider {
  private client: OpenAI;
  private readonly logger = new Logger(GroqProvider.name);
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.groqApiKey') || '',
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.model =
      this.configService.get<string>('ai.groqModel') || 'llama-3.3-70b-versatile';
  }

  async chat(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Groq Chat Error:', error);
      throw error;
    }
  }

  async extractIntent(message: string): Promise<any> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
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
      this.logger.error('Groq Extract Intent Error:', error);
      throw error;
    }
  }

  async qualifyLead(data: any): Promise<{ score: number; priority: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a lead qualification assistant for a real estate platform. Return raw JSON only with 'score' (0-100) and 'priority' (LOW, MEDIUM, or HOT). HOT: budget specified, buying soon, high engagement. MEDIUM: interest shown but missing budget or unclear timeline. LOW: just browsing, generic questions.`,
          },
          {
            role: 'user',
            content: `Qualify this lead: ${JSON.stringify(data)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(
        response.choices[0].message.content || '{"score": 50, "priority": "MEDIUM"}',
      );
    } catch (error) {
      this.logger.error('Groq Qualify Lead Error:', error);
      return { score: 50, priority: 'MEDIUM' };
    }
  }
}
