import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiPropertyOptional({ example: 'Hello, is this property still available?' })
  @IsOptional()
  @IsString()
  content?: string;
}
