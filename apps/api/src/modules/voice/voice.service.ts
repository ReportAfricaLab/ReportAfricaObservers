import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Supported African languages for transcription
const LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  yo: 'en-US', // Yoruba — fallback to English, post-process
  ha: 'en-US', // Hausa — fallback
  ig: 'en-US', // Igbo — fallback
  sw: 'sw-KE', // Swahili (Kenya)
  zu: 'en-ZA', // Zulu — use South African English
  af: 'af-ZA', // Afrikaans
  fr: 'fr-FR', // French (Rwanda, etc.)
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly s3Bucket: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get('AWS_REGION', 'us-east-1');
    this.accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');
    this.s3Bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-uploads');
  }

  async transcribeAudio(audioUrl: string, language = 'en'): Promise<{ text: string; confidence: number; language: string }> {
    const languageCode = LANGUAGE_MAP[language] || 'en-US';
    const jobName = `transcribe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!this.accessKeyId || this.accessKeyId === 'your_access_key') {
      // Dev mode — return mock
      return { text: '[Mock transcription] This is a test voice note.', confidence: 0.95, language };
    }

    try {
      // Start transcription job
      await fetch(`https://transcribe.${this.region}.amazonaws.com`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Transcribe.StartTranscriptionJob',
        },
        body: JSON.stringify({
          TranscriptionJobName: jobName,
          LanguageCode: languageCode,
          Media: { MediaFileUri: audioUrl },
          OutputBucketName: this.s3Bucket,
          OutputKey: `transcriptions/${jobName}.json`,
          Settings: {
            ShowSpeakerLabels: false,
            MaxSpeakerLabels: 1,
          },
        }),
      });

      // Poll for completion (max 60 seconds)
      const result = await this.pollForResult(jobName);
      return result;
    } catch (error) {
      this.logger.error('Transcription failed', error);
      return { text: '', confidence: 0, language };
    }
  }

  // Simplified: translate text to English using Amazon Translate
  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    if (sourceLanguage === 'en' || !text) return text;

    if (!this.accessKeyId || this.accessKeyId === 'your_access_key') {
      return `[Translated from ${sourceLanguage}] ${text}`;
    }

    try {
      const response = await fetch(`https://translate.${this.region}.amazonaws.com`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSShineFrontendService_20170701.TranslateText',
        },
        body: JSON.stringify({
          Text: text,
          SourceLanguageCode: sourceLanguage === 'sw' ? 'sw' : 'auto',
          TargetLanguageCode: 'en',
        }),
      });

      const data = await response.json();
      return data.TranslatedText || text;
    } catch (error) {
      this.logger.error('Translation failed', error);
      return text;
    }
  }

  // Process voice note: transcribe + translate
  async processVoiceNote(audioUrl: string, language = 'en'): Promise<{ originalText: string; englishText: string; language: string; confidence: number }> {
    const transcription = await this.transcribeAudio(audioUrl, language);

    let englishText = transcription.text;
    if (language !== 'en' && transcription.text) {
      englishText = await this.translateToEnglish(transcription.text, language);
    }

    return {
      originalText: transcription.text,
      englishText,
      language,
      confidence: transcription.confidence,
    };
  }

  private async pollForResult(jobName: string, maxAttempts = 12): Promise<{ text: string; confidence: number; language: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s between polls

      try {
        const response = await fetch(`https://transcribe.${this.region}.amazonaws.com`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'Transcribe.GetTranscriptionJob',
          },
          body: JSON.stringify({ TranscriptionJobName: jobName }),
        });

        const data = await response.json();
        const status = data.TranscriptionJob?.TranscriptionJobStatus;

        if (status === 'COMPLETED') {
          const transcriptUri = data.TranscriptionJob?.Transcript?.TranscriptFileUri;
          if (transcriptUri) {
            const transcriptRes = await fetch(transcriptUri);
            const transcript = await transcriptRes.json();
            const text = transcript.results?.transcripts?.[0]?.transcript || '';
            const confidence = transcript.results?.items?.[0]?.alternatives?.[0]?.confidence || 0;
            return { text, confidence: Number(confidence), language: data.TranscriptionJob?.LanguageCode };
          }
        } else if (status === 'FAILED') {
          return { text: '', confidence: 0, language: '' };
        }
      } catch {
        // Continue polling
      }
    }

    return { text: '', confidence: 0, language: '' };
  }
}
