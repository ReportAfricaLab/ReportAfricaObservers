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

@Entity('referrals')
export class ReferralEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id' })
  @Index()
  referrerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'referrer_id' })
  referrer: UserEntity;

  @Column({ name: 'referee_id' })
  @Index()
  refereeId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'referee_id' })
  referee: UserEntity;

  @Column({ name: 'referral_code' })
  @Index()
  referralCode: string;

  @Column({ name: 'reward_paid', default: false })
  rewardPaid: boolean;

  @Column({ name: 'reward_type', default: 'trust_points' })
  rewardType: string; // trust_points, cash

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
