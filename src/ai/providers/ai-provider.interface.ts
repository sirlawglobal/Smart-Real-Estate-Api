export interface AiProvider {
  chat(prompt: string): Promise<string>;
  chatWithContext(message: string, context: string): Promise<string>;
  extractIntent(message: string): Promise<any>;
  qualifyLead(data: any): Promise<{ score: number; priority: string }>;
}
