import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, ListingType } from '../enums/property.enum';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Luxury 4-bedroom duplex in Lekki' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'A beautifully designed duplex with modern finishes...' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 150000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'Lekki' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Lagos' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: '12 Admiralty Way, Lekki Phase 1' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bathrooms?: number;

  @ApiProperty({ enum: PropertyType, example: PropertyType.DUPLEX })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({ enum: ListingType, example: ListingType.SALE })
  @IsEnum(ListingType)
  listingType: ListingType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
