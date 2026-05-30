import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleAiDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsBoolean()
  isAiActive: boolean;
}
