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

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Groq Chat With Context Error:', error);
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
