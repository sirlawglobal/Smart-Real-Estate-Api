import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Property } from '../entities/property.entity';
import { ApprovalStatus } from '../enums/property.enum';

@Injectable()
export class PropertyRepository extends BaseRepository<Property> {
  constructor(
    @InjectRepository(Property)
    repo: Repository<Property>,
  ) {
    super(repo);
  }

  async findPending(): Promise<Property[]> {
    return this.findAll({
      where: { approvalStatus: ApprovalStatus.PENDING },
      relations: { images: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findFeatured(): Promise<Property[]> {
    return this.findAll({
      where: { featured: true, approvalStatus: ApprovalStatus.APPROVED },
      relations: { images: true, createdBy: true },
      take: 10,
      order: { createdAt: 'DESC' },
    });
  }
}
