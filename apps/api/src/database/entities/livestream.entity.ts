import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('livestreams')
export class LivestreamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ default: 'general' })
  category: string;

  @Column({ length: 2 })
  @Index()
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'channel_arn', nullable: true })
  channelArn: string;

  @Column({ name: 'stream_key_value', nullable: true, select: false })
  streamKeyValue: string;

  @Column({ name: 'ingest_endpoint', nullable: true })
  ingestEndpoint: string;

  @Column({ name: 'playback_url', nullable: true })
  playbackUrl: string;

  @Column({ default: 'ready' })
  @Index()
  status: string; // ready, live, ended

  @Column({ name: 'viewer_count', type: 'int', default: 0 })
  viewerCount: number;

  @Column({ name: 'peak_viewers', type: 'int', default: 0 })
  peakViewers: number;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
