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

  async chatWithContext(message: string, context: string): Promise<string> {
    try {
      const systemPrompt = context.trim()
        ? `You are a professional real estate assistant for a Nigerian real estate platform.
Answer the user's question based ONLY on the property listings provided below.
Be helpful, concise, and conversational. Format all prices in Nigerian Naira (₦) with commas.
When referencing a property, mention its title, location, price, and key details.
If the user's exact search criteria don't perfectly match any listing, show the closest matches and note the difference.
If there are truly no relevant listings at all, say: "We don't currently have listings matching your exact criteria. Please try a different location or adjust your budget."
Do NOT invent properties, prices, or details that are not in the listings below.

=== AVAILABLE PROPERTY LISTINGS ===
${context}
=== END OF LISTINGS ===`
        : `You are a professional real estate assistant for a Nigerian real estate platform.
We currently have no property listings available that match the user's search.
Politely inform the user and suggest they try a different location, property type, or budget range, or contact our support team.`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.openaiModel') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI Chat With Context Error:', error);
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
