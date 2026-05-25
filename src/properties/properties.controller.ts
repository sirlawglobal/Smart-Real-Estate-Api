import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyFilterDto } from './dto/property-filter.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured properties' })
  getFeatured() {
    return this.propertiesService.getFeatured();
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search and filter properties' })
  search(@Query() filter: PropertyFilterDto) {
    return this.propertiesService.search(filter);
  }

  @Get('my-properties')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get agent own properties' })
  getMyProperties(
    @CurrentUser() user: User,
    @Query() filter: PropertyFilterDto,
  ) {
    return this.propertiesService.findByAgent(user.id, filter);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all approved properties' })
  findAll(@Query() filter: PropertyFilterDto) {
    return this.propertiesService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new property (AGENT/ADMIN)' })
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update property' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePropertyDto>,
    @CurrentUser() user: User,
  ) {
    return this.propertiesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete property' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.propertiesService.remove(id, user);
  }

  @Post(':id/images')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload property images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage() }))
  addImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.propertiesService.addImages(id, files, user);
  }

  @Delete(':id/images/:imageId')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove property image' })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: User,
  ) {
    return this.propertiesService.removeImage(id, imageId, user);
  }
}
