import { reportsAPI } from './api';
import api from './api';

const QUEUE_KEY = '@reportafrica_offline_queue';
const ELECTION_QUEUE_KEY = '@reportafrica_election_queue';

const getStorage = () => require('@react-native-async-storage/async-storage').default;
const getNetInfo = () => require('@react-native-community/netinfo').default;

export interface QueuedReport {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  isAnonymous: boolean;
  mediaUris: string[];
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

class OfflineQueueService {
  private isSyncing = false;
  private unsubscribe: (() => void) | null = null;

  // Start listening for connectivity changes
  init() {
    try {
      const NetInfo = getNetInfo();
      this.unsubscribe = NetInfo.addEventListener((state: any) => {
        if (state.isConnected && state.isInternetReachable) {
          this.syncAll();
        }
      });
    } catch {}
  }

  destroy() {
    this.unsubscribe?.();
  }

  async addToQueue(report: Omit<QueuedReport, 'id' | 'createdAt' | 'status' | 'retryCount'>) {
    const queue = await this.getQueue();
    const entry: QueuedReport = {
      ...report,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    queue.push(entry);
    try { await getStorage().setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
    return entry;
  }

  async getQueue(): Promise<QueuedReport[]> {
    try {
      const raw = await getStorage().getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter((r) => r.status === 'pending' || r.status === 'failed').length;
  }

  async removeFromQueue(id: string) {
    const queue = await this.getQueue();
    const filtered = queue.filter((r) => r.id !== id);
    try { await getStorage().setItem(QUEUE_KEY, JSON.stringify(filtered)); } catch {}
  }

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await this.getQueue();
      const pending = queue.filter((r) => r.status === 'pending' || r.status === 'failed');

      for (const report of pending) {
        if (report.retryCount >= 3) continue;

        try {
          report.status = 'syncing';
          await this.saveQueue(queue);

          await reportsAPI.create({
            title: report.title,
            description: report.description,
            category: report.category,
            severity: report.severity,
            latitude: report.latitude,
            longitude: report.longitude,
            isAnonymous: report.isAnonymous,
            mediaUrls: [], // Media not available offline
          });

          await this.removeFromQueue(report.id);
        } catch {
          report.status = 'failed';
          report.retryCount += 1;
          await this.saveQueue(queue);
        }
      }
    } finally {
      this.isSyncing = false;
    }

    // Also sync election reports
    await this.syncElectionReports();
  }

  async isOnline(): Promise<boolean> {
    try {
      const NetInfo = getNetInfo();
      const state = await NetInfo.fetch();
      return !!(state.isConnected && state.isInternetReachable);
    } catch { return true; } // Assume online if check fails
  }

  private async saveQueue(queue: QueuedReport[]) {
    try { await getStorage().setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
  }

  // === ELECTION QUEUE ===

  async addElectionReport(report: {
    type: string;
    electionName: string;
    state?: string;
    lga?: string;
    ward?: string;
    pollingUnit?: string;
    description?: string;
    results?: Record<string, number>;
    mediaUris: string[];
    latitude?: number;
    longitude?: number;
    isRecording?: boolean;
  }) {
    const queue = await this.getElectionQueue();
    const entry = {
      ...report,
      id: `election_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recordedAt: new Date().toISOString(),
      status: 'pending' as const,
      retryCount: 0,
    };
    queue.push(entry);
    try { await getStorage().setItem(ELECTION_QUEUE_KEY, JSON.stringify(queue)); } catch {}
    return entry;
  }

  async getElectionQueue(): Promise<any[]> {
    try {
      const raw = await getStorage().getItem(ELECTION_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async getElectionPendingCount(): Promise<number> {
    const queue = await this.getElectionQueue();
    return queue.filter((r: any) => r.status === 'pending' || r.status === 'failed').length;
  }

  async syncElectionReports() {
    const queue = await this.getElectionQueue();
    const pending = queue.filter((r: any) => r.status === 'pending' || r.status === 'failed');

    for (const report of pending) {
      if (report.retryCount >= 3) continue;
      try {
        report.status = 'syncing';
        await this.saveElectionQueue(queue);

        const mediaUrls: { type: string; url: string }[] = [];
        for (const uri of report.mediaUris || []) {
          try {
            const isVideo = uri.includes('.mp4') || uri.includes('video');
            const fileType = isVideo ? 'video' : 'image';
            const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
            const res = await api.post('/upload/presigned-url', { fileType, contentType });
            const { uploadUrl, fileUrl } = res.data;
            const blob = await fetch(uri).then((r) => r.blob());
            await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
            mediaUrls.push({ type: contentType, url: fileUrl });
          } catch {}
        }

        await api.post('/elections/report', {
          type: report.type,
          electionName: report.electionName,
          state: report.state,
          lga: report.lga,
          ward: report.ward,
          pollingUnit: report.pollingUnit,
          description: report.description,
          results: report.results,
          media: mediaUrls.length > 0 ? mediaUrls : undefined,
          latitude: report.latitude,
          longitude: report.longitude,
          recordedAt: report.recordedAt,
        });

        const updated = queue.filter((r: any) => r.id !== report.id);
        await this.saveElectionQueue(updated);
      } catch {
        report.status = 'failed';
        report.retryCount += 1;
        await this.saveElectionQueue(queue);
      }
    }
  }

  private async saveElectionQueue(queue: any[]) {
    try { await getStorage().setItem(ELECTION_QUEUE_KEY, JSON.stringify(queue)); } catch {}
  }
}

export const offlineQueue = new OfflineQueueService();
