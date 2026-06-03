import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiKey: string;
  private readonly groqKey: string;

  constructor(private readonly config: ConfigService) {
    this.geminiKey = this.config.get('GEMINI_API_KEY', '');
    this.groqKey = this.config.get('GROQ_API_KEY', '');
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string | null> {
    // Try Gemini first
    if (this.geminiKey) {
      const result = await this.tryGemini(systemPrompt, userMessage);
      if (result) return result;
    }

    // Fallback to Groq
    if (this.groqKey) {
      const result = await this.tryGroq(systemPrompt, userMessage);
      if (result) return result;
    }

    // All AI providers failed
    this.logger.warn('All AI providers failed');
    return null;
  }

  private async tryGemini(systemPrompt: string, userMessage: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`Gemini failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      this.logger.warn('Gemini error', error);
      return null;
    }
  }

  private async tryGroq(systemPrompt: string, userMessage: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Groq failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      this.logger.warn('Groq error', error);
      return null;
    }
  }
}
