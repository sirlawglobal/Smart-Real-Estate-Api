import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './providers/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class AiService {
  private provider: AiProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAiProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
    private readonly propertiesService: PropertiesService,
  ) {
    const providerName = this.configService.get<string>('ai.provider') || 'groq';
    if (providerName === 'gemini') {
      this.provider = this.geminiProvider;
    } else if (providerName === 'groq') {
      this.provider = this.groqProvider;
    } else {
      this.provider = this.openaiProvider;
    }
  }

  async chat(message: string): Promise<{ response: string }> {
    if (!message) throw new BadRequestException('Message is required');
    const response = await this.provider.chat(message);
    return { response };
  }

  async extractIntent(message: string) {
    if (!message) throw new BadRequestException('Message is required');
    const intent = await this.provider.extractIntent(message);
    return { data: intent };
  }

  async recommendations(message: string) {
    if (!message) throw new BadRequestException('Message is required');
    
    // 1. Extract intent
    const intent = await this.provider.extractIntent(message);
    
    // 2. Fetch properties matching intent
    const filters = {
      city: intent.location,
      maxPrice: intent.budget,
      bedrooms: intent.bedrooms,
      propertyType: intent.propertyType,
    };
    
    const properties = await this.propertiesService.findForRecommendations(filters);
    
    return { intent, recommendations: properties };
  }

  async qualifyLead(data: any) {
    if (!data) throw new BadRequestException('Lead data is required');
    const qualification = await this.provider.qualifyLead(data);
    return { data: qualification };
  }
}
