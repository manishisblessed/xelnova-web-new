import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessRegisterDto {
  @ApiProperty({ example: 'Acme Procurement' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  organizationName: string;

  @ApiPropertyOptional({ example: 'Acme India Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  /** India GSTIN (15 characters) — optional at signup */
  @ApiPropertyOptional({ example: '27AABCU9603R1ZX' })
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'GSTIN must be a valid 15-character format',
  })
  gstin?: string;

  @ApiProperty({ example: 'Priya Nair' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'priya.nair@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class BusinessLoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'GSTIN must be a valid 15-character format',
  })
  gstin?: string;
}
