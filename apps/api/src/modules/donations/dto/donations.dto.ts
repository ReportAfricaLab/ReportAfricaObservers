import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, MaxLength, IsIn, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  description: string;

  @IsString()
  @IsIn(['medical', 'disaster', 'abuse_survivor', 'education', 'legal_aid', 'community'])
  category: string;

  @IsNumber()
  @Min(1000)
  targetAmount: number;

  @IsNumber()
  @Min(1000)
  @IsOptional()
  beneficiaryAmount?: number;

  @IsString()
  @IsOptional()
  reportId?: string;

  @IsString()
  @IsIn(['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'RWF', 'USD', 'TZS', 'ETB', 'XOF', 'XAF', 'EGP'])
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean;

  @IsString()
  @IsOptional()
  beneficiaryName?: string;

  // Bank details - required for payout
  @IsString()
  beneficiaryBank: string;

  @IsString()
  beneficiaryAccount: string;

  // User must agree to 15% platform fee
  @IsBoolean()
  agreedToPlatformFee: boolean;

  @IsArray()
  @IsOptional()
  media?: { type: string; url: string }[];

  @IsArray()
  @IsOptional()
  documents?: { type: string; url: string; label: string }[];
}

export class InitiateDonationDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsString()
  email: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}
