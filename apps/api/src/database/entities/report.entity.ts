import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('reports')
@Index(['country', 'createdAt'])
@Index(['country', 'category'])
@Index(['latitude', 'longitude'])
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  @Index()
  category: string;

  @Column({ default: 'medium' })
  severity: string;

  @Column({ name: 'verification_level', default: 'unverified' })
  verificationLevel: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  @Index()
  longitude: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ length: 2 })
  @Index()
  country: string;

  @Column({ name: 'author_id', nullable: true })
  @Index()
  authorId: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @Column({ name: 'is_live', default: false })
  isLive: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  media: { type: string; url: string; thumbnailUrl?: string; duration?: number }[];

  @Column({ type: 'int', default: 0 })
  upvotes: number;

  @Column({ type: 'int', default: 0 })
  downvotes: number;

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'content_hash', nullable: true })
  contentHash: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
