import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LivestreamEntity } from '../../database/entities';
import { LivestreamService } from './livestream.service';
import { LivestreamController } from './livestream.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LivestreamEntity])],
  controllers: [LivestreamController],
  providers: [LivestreamService],
  exports: [LivestreamService],
})
export class LivestreamModule {}
