import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString } from 'class-validator';
import { FaceBlurService } from './face-blur.service';

class BlurFacesDto {
  @IsString()
  s3Key: string;
}

@Controller('face-blur')
export class FaceBlurController {
  constructor(private readonly faceBlurService: FaceBlurService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async blurFaces(@Body() dto: BlurFacesDto) {
    const result = await this.faceBlurService.blurFacesInImage(dto.s3Key);
    if (!result) return { blurred: false, message: 'No faces detected or processing failed' };
    return { blurred: true, ...result };
  }
}
