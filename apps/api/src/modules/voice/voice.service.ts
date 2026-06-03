import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US', yo: 'en-US', ha: 'en-US', ig: 'en-US',
  sw: 'sw-KE', zu: 'en-ZA', af: 'af-ZA', fr: 'fr-FR',
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly transcribeClient: TranscribeClient | null;
  private readonly translateClient: TranslateClient | null;
  private readonly s3Bucket: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');
    const region = this.config.get('AWS_REGION', 'eu-west-1');
    this.s3Bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-media-prod');

    if (accessKeyId && secretAccessKey) {
      const credentials = { accessKeyId, secretAccessKey };
      this.transcribeClient = new TranscribeClient({ region, credentials });
      this.translateClient = new TranslateClient({ region, credentials });
    } else {
      this.transcribeClient = null;
      this.translateClient = null;
    }
  }

  async processVoiceNote(audioUrl: string, language = 'en'): Promise<{ originalText: string; englishText: string; language: string; confidence: number }> {
    const transcription = await this.transcribeAudio(audioUrl, language);
    let englishText = transcription.text;

    if (language !== 'en' && transcription.text) {
      englishText = await this.translateToEnglish(transcription.text, language);
    }

    return { originalText: transcription.text, englishText, language, confidence: transcription.confidence };
  }

  async transcribeAudio(audioUrl: string, language = 'en'): Promise<{ text: string; confidence: number; language: string }> {
    if (!this.transcribeClient) {
      return { text: '[Mock] Voice transcription not configured.', confidence: 0.95, language };
    }

    const languageCode = LANGUAGE_MAP[language] || 'en-US';
    const jobName = `ra_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      await this.transcribeClient.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: languageCode,
        Media: { MediaFileUri: audioUrl },
        OutputBucketName: this.s3Bucket,
        OutputKey: `transcriptions/${jobName}.json`,
      }));

      return await this.pollForResult(jobName, language);
    } catch (error) {
      this.logger.error('Transcription failed', error);
      return { text: '', confidence: 0, language };
    }
  }

  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    if (!text || sourceLanguage === 'en' || !this.translateClient) return text;

    try {
      const response = await this.translateClient.send(new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLanguage === 'sw' ? 'sw' : 'auto',
        TargetLanguageCode: 'en',
      }));
      return response.TranslatedText || text;
    } catch (error) {
      this.logger.error('Translation failed', error);
      return text;
    }
  }

  private async pollForResult(jobName: string, language: string, maxAttempts = 12): Promise<{ text: string; confidence: number; language: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      try {
        const response = await this.transcribeClient!.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
        const status = response.TranscriptionJob?.TranscriptionJobStatus;

        if (status === 'COMPLETED') {
          const uri = response.TranscriptionJob?.Transcript?.TranscriptFileUri;
          if (uri) {
            const res = await fetch(uri);
            const transcript = await res.json();
            const text = transcript.results?.transcripts?.[0]?.transcript || '';
            return { text, confidence: 0.9, language };
          }
        } else if (status === 'FAILED') {
          return { text: '', confidence: 0, language };
        }
      } catch { /* continue polling */ }
    }
    return { text: '', confidence: 0, language };
  }
}
