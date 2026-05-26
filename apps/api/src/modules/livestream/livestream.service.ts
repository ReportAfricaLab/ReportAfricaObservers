import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LivestreamEntity } from '../../database/entities';

@Injectable()
export class LivestreamService {
  private readonly logger = new Logger(LivestreamService.name);
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(LivestreamEntity)
    private readonly streamRepo: Repository<LivestreamEntity>,
  ) {
    this.region = this.config.get('AWS_REGION', 'us-east-1');
    this.accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');
  }

  async createStream(userId: string, country: string, dto: { title: string; description?: string; category?: string; latitude?: number; longitude?: number }) {
    // Create IVS channel via AWS API
    const channelData = await this.createIVSChannel(dto.title);

    const stream = this.streamRepo.create({
      userId,
      country,
      title: dto.title,
      description: dto.description || '',
      category: dto.category || 'general',
      latitude: dto.latitude,
      longitude: dto.longitude,
      channelArn: channelData.channelArn,
      streamKeyValue: channelData.streamKeyValue,
      ingestEndpoint: channelData.ingestEndpoint,
      playbackUrl: channelData.playbackUrl,
      status: 'ready',
    });

    return this.streamRepo.save(stream);
  }

  async goLive(streamId: string, userId: string) {
    const stream = await this.streamRepo.findOne({ where: { id: streamId, userId } });
    if (!stream) throw new NotFoundException('Stream not found');

    stream.status = 'live';
    stream.startedAt = new Date();
    return this.streamRepo.save(stream);
  }

  async endStream(streamId: string, userId: string) {
    const stream = await this.streamRepo.findOne({ where: { id: streamId, userId } });
    if (!stream) throw new NotFoundException('Stream not found');

    stream.status = 'ended';
    stream.endedAt = new Date();
    return this.streamRepo.save(stream);
  }

  async getLiveStreams(country: string, page = 1, limit = 20) {
    return this.streamRepo.find({
      where: { country, status: 'live' },
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  async getStreamById(id: string) {
    return this.streamRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async getRecordings(country: string, page = 1, limit = 20) {
    return this.streamRepo.find({
      where: { country, status: 'ended' },
      order: { endedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  async getUserStreams(userId: string) {
    return this.streamRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  private async createIVSChannel(title: string): Promise<{ channelArn: string; streamKeyValue: string; ingestEndpoint: string; playbackUrl: string }> {
    if (!this.accessKeyId) {
      // Dev mode — return mock data
      const mockId = `mock_${Date.now()}`;
      return {
        channelArn: `arn:aws:ivs:${this.region}:000000000000:channel/${mockId}`,
        streamKeyValue: `sk_live_mock_${mockId}`,
        ingestEndpoint: `rtmps://${mockId}.global-contribute.live-video.net:443/app/`,
        playbackUrl: `https://${mockId}.us-east-1.playback.live-video.net/api/video/v1/us-east-1.000000000000.channel.${mockId}.m3u8`,
      };
    }

    // Production — call AWS IVS API
    try {
      const response = await fetch(`https://ivs.${this.region}.amazonaws.com/CreateChannel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Amz-Target': 'AmazonInteractiveVideoService.CreateChannel',
        },
        body: JSON.stringify({
          name: title.substring(0, 128),
          type: 'STANDARD',
          latencyMode: 'LOW',
          authorized: false,
          recordingConfigurationArn: this.config.get('AWS_IVS_RECORDING_ARN', ''),
        }),
      });

      const data = await response.json();
      return {
        channelArn: data.channel?.arn || '',
        streamKeyValue: data.streamKey?.value || '',
        ingestEndpoint: data.channel?.ingestEndpoint || '',
        playbackUrl: data.channel?.playbackUrl || '',
      };
    } catch (error) {
      this.logger.error('Failed to create IVS channel', error);
      throw error;
    }
  }
}
