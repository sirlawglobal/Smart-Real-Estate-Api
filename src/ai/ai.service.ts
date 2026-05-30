import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './providers/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { PropertiesService } from '../properties/properties.service';
import { Property } from '../properties/entities/property.entity';

@Injectable()
export class AiService {
  private provider: AiProvider;
  private readonly logger = new Logger(AiService.name);

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

  /**
   * RAG-powered chat: retrieves real property listings from the DB,
   * builds a context string, and sends it to the LLM so it can only
   * answer based on actual data — no hallucinations.
   */
  async chat(message: string): Promise<{ response: string }> {
    if (!message) throw new BadRequestException('Message is required');

    // Step 1: Extract intent from user message (graceful fallback on failure)
    let intent: any = {};
    try {
      intent = await this.provider.extractIntent(message);
      this.logger.log(`RAG intent extracted: ${JSON.stringify(intent)}`);
    } catch (err) {
      this.logger.warn('Intent extraction failed, proceeding with empty filters', err?.message);
    }

    // Step 2: Query DB for real matching properties
    const filters = {
      city: intent.location ?? undefined,
      maxPrice: intent.budget ?? undefined,
      bedrooms: intent.bedrooms ?? undefined,
      propertyType: intent.propertyType ?? undefined,
    };
    const properties = await this.propertiesService.findForRecommendations(filters);
    this.logger.log(`RAG retrieved ${properties.length} properties from DB for context`);

    // Step 3: Format properties as readable context for the LLM
    const context = this.buildPropertyContext(properties);

    // Step 4: Ask the LLM to answer using only the DB context
    const response = await this.provider.chatWithContext(message, context);
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

  // ── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Converts an array of Property entities into a numbered plain-text list
   * that the LLM can easily parse and reference.
   */
  private buildPropertyContext(properties: Property[]): string {
    if (!properties.length) return '';

    return properties
      .map(
        (p, i) =>
          `[Property ${i + 1}]
Title: ${p.title}
Type: ${p.propertyType} | Listing: ${p.listingType}
Location: ${p.address}, ${p.city}, ${p.state}
Price: ₦${Number(p.price).toLocaleString('en-NG')}
Bedrooms: ${p.bedrooms} | Bathrooms: ${p.bathrooms}
Description: ${p.description ? p.description.substring(0, 300) : 'N/A'}`,
      )
      .join('\n\n---\n\n');
  }
}
