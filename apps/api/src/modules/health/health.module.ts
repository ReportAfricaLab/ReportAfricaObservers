import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../database/entities';
import { HealthController } from './health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [HealthController],
})
export class HealthModule {}
