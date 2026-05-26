import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsIn } from 'class-validator';
import { UploadService } from './upload.service';

class GetUploadUrlDto {
  @IsString()
  @IsIn(['image', 'video', 'voice_note', 'document'])
  fileType: string;

  @IsString()
  contentType: string;
}

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('presigned-url')
  getPresignedUrl(@Request() req: any, @Body() dto: GetUploadUrlDto) {
    return this.uploadService.getPresignedUploadUrl(req.user.id, dto.fileType, dto.contentType);
  }
}
