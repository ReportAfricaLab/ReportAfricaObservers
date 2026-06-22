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

@Entity('campaigns')
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  @Index()
  category: string; // medical, disaster, abuse_survivor, education, legal_aid, community

  @Column({ name: 'target_amount', type: 'decimal', precision: 12, scale: 2 })
  targetAmount: number;

  @Column({ name: 'raised_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  raisedAmount: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ name: 'author_id' })
  @Index()
  authorId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @Column({ length: 2 })
  @Index()
  country: string;

  @Column({ name: 'verification_level', default: 'pending_review' })
  verificationLevel: string; // pending_review, community_verified, medical_verified, ngo_verified, emergency_verified

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'is_emergency', default: false })
  isEmergency: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  media: { type: string; url: string }[];

  @Column({ type: 'jsonb', default: '[]' })
  documents: { type: string; url: string; label: string }[]; // medical docs, police reports, etc.

  @Column({ name: 'beneficiary_name', nullable: true })
  beneficiaryName: string;

  @Column({ name: 'beneficiary_bank', nullable: true })
  beneficiaryBank: string;

  @Column({ name: 'beneficiary_account', nullable: true })
  beneficiaryAccount: string;

  @Column({ name: 'donor_count', type: 'int', default: 0 })
  donorCount: number;

  @Column({ name: 'share_count', type: 'int', default: 0 })
  shareCount: number;

  @Column({ name: 'report_id', nullable: true })
  reportId: string;

  @Column({ name: 'reporter_id', nullable: true })
  reporterId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reporter_id' })
  reporter: UserEntity;

  @Column({ name: 'beneficiary_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  beneficiaryAmount: number;

  @Column({ name: 'agreed_to_platform_fee', default: false })
  agreedToPlatformFee: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
