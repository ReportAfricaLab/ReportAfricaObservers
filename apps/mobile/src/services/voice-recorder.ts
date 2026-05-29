import { Audio } from 'expo-av';
import axios from 'axios';
import { getAuthToken } from './api';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://api.reportafrica.com/api/v1';

class VoiceRecorderService {
  private recording: Audio.Recording | null = null;

  async startRecording(): Promise<void> {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    this.recording = recording;
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;

    await this.recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = this.recording.getURI();
    this.recording = null;
    return uri;
  }

  async uploadAndTranscribe(audioUri: string, language = 'en'): Promise<{ originalText: string; englishText: string; confidence: number }> {
    const token = getAuthToken();

    // 1. Get presigned URL for upload
    const presignRes = await axios.post(
      `${API_URL}/upload/presigned-url`,
      { fileType: 'audio', contentType: 'audio/m4a' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { uploadUrl, fileUrl } = presignRes.data;

    // 2. Upload audio file
    const blob = await fetch(audioUri).then((r) => r.blob());
    await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'audio/m4a' } });

    // 3. Send to transcription endpoint
    const transcribeRes = await axios.post(
      `${API_URL}/voice/transcribe`,
      { audioUrl: fileUrl, language },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return transcribeRes.data;
  }

  isRecording(): boolean {
    return this.recording !== null;
  }
}

export const voiceRecorder = new VoiceRecorderService();
