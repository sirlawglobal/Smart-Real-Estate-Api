import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  conversationId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  leadId?: number;

  @ApiProperty({ example: 'Hello, is this property still available?' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
