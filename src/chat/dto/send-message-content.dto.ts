import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageContentDto {
  @ApiProperty({ example: 'Hello, is this property still available?' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
