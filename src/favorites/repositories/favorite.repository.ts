import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Favorite } from '../entities/favorite.entity';

@Injectable()
export class FavoriteRepository extends BaseRepository<Favorite> {
  constructor(
    @InjectRepository(Favorite)
    repo: Repository<Favorite>,
  ) {
    super(repo);
  }

  async findByUser(userId: number): Promise<Favorite[]> {
    return this.findAll({
      where: { userId } as any,
      relations: { property: { images: true } } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findByUserAndProperty(
    userId: number,
    propertyId: number,
  ): Promise<Favorite | null> {
    return this.findByWhere({ userId, propertyId } as any);
  }
}
