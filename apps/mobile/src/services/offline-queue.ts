import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { reportsAPI } from './api';

const QUEUE_KEY = '@reportafrica_offline_queue';

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
    this.unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.syncAll();
      }
    });
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
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return entry;
  }

  async getQueue(): Promise<QueuedReport[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter((r) => r.status === 'pending' || r.status === 'failed').length;
  }

  async removeFromQueue(id: string) {
    const queue = await this.getQueue();
    const filtered = queue.filter((r) => r.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  }

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await this.getQueue();
      const pending = queue.filter((r) => r.status === 'pending' || r.status === 'failed');

      for (const report of pending) {
        if (report.retryCount >= 3) continue; // Skip after 3 failures

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
            mediaUrls: [], // Media upload handled separately for offline
          });

          // Success — remove from queue
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
  }

  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  }

  private async saveQueue(queue: QueuedReport[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export const offlineQueue = new OfflineQueueService();
