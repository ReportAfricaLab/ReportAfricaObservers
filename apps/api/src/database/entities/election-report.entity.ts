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

@Entity('election_reports')
export class ElectionReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ length: 2 })
  @Index()
  country: string;

  @Column()
  @Index()
  type: string; // result_upload, violence, vote_buying, intimidation, ballot_snatching, observer_report

  @Column({ name: 'election_name' })
  electionName: string;

  @Column({ name: 'polling_unit', nullable: true })
  pollingUnit: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  lga: string;

  @Column({ nullable: true })
  ward: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '{}' })
  results: Record<string, number>; // { "party_a": 500, "party_b": 300 }

  @Column({ type: 'jsonb', default: '[]' })
  media: { type: string; url: string }[];

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'verification_level', default: 'unverified' })
  verificationLevel: string;

  @Column({ name: 'is_verified_observer', default: false })
  isVerifiedObserver: boolean;

  @Column({ name: 'recorded_at', nullable: true })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
