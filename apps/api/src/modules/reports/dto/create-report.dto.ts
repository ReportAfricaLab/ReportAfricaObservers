import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, MaxLength, IsIn } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsIn(['traffic', 'police_security', 'government', 'construction', 'election', 'emergency', 'environmental', 'market_consumer', 'gender_violence', 'health', 'corruption', 'utilities', 'missing_persons'])
  category: string;

  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  isLive?: boolean;

  @IsArray()
  @IsOptional()
  media?: { type: string; url: string; thumbnailUrl?: string; duration?: number }[];

  @IsString()
  @IsOptional()
  contentHash?: string;
}
