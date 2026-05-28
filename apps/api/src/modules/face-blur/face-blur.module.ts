import { Module } from '@nestjs/common';
import { FaceBlurService } from './face-blur.service';
import { FaceBlurController } from './face-blur.controller';

@Module({
  controllers: [FaceBlurController],
  providers: [FaceBlurService],
  exports: [FaceBlurService],
})
export class FaceBlurModule {}
