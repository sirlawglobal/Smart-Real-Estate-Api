import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyRepository } from './repositories/property.repository';
import { PropertyImageRepository } from './repositories/property-image.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyImage])],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyRepository, PropertyImageRepository],
  exports: [PropertiesService, PropertyRepository],
})
export class PropertiesModule {}
