import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new lead (public)' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get('my-leads')
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Get agent own leads' })
  getMyLeads(
    @CurrentUser() user: User,
    @Query() filter: LeadFilterDto,
  ) {
    return this.leadsService.getMyLeads(user, filter);
  }

  @Get('hot')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get hot leads' })
  getHotLeads(
    @CurrentUser() user: User,
    @Query() filter: LeadFilterDto,
  ) {
    return this.leadsService.getHotLeads(user, filter);
  }

  @Get()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List leads' })
  findAll(
    @Query() filter: LeadFilterDto,
    @CurrentUser() user: User,
  ) {
    return this.leadsService.findAll(filter, user);
  }

  @Get(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.leadsService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.leadsService.updateStatus(id, dto, user);
  }
}
