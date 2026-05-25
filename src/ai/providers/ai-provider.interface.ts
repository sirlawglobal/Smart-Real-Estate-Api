export interface AiProvider {
  chat(prompt: string): Promise<string>;
  extractIntent(message: string): Promise<any>;
  qualifyLead(data: any): Promise<{ score: number; priority: string }>;
}
