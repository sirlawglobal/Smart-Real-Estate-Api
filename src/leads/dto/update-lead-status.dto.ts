import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeadStatus } from '../enums/lead.enum';

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.CONTACTED })
  @IsNotEmpty()
  @IsEnum(LeadStatus)
  status: LeadStatus;
}
