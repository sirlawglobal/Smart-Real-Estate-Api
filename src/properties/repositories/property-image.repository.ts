import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { PropertyImage } from '../entities/property-image.entity';

@Injectable()
export class PropertyImageRepository extends BaseRepository<PropertyImage> {
  constructor(
    @InjectRepository(PropertyImage)
    repo: Repository<PropertyImage>,
  ) {
    super(repo);
  }
}
