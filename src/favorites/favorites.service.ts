import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    private readonly propertiesService: PropertiesService,
  ) {}

  async addFavorite(propertyId: number, user: User): Promise<Favorite> {
    const property = await this.propertiesService.findOne(propertyId);
    if (!property) {
      throw new NotFoundException(`Property #${propertyId} not found`);
    }

    const existing = await this.favoriteRepo.findOne({
      where: { userId: user.id, propertyId },
    });

    if (existing) {
      throw new ConflictException('Property is already in your favorites');
    }

    const favorite = this.favoriteRepo.create({
      userId: user.id,
      propertyId,
    });

    return this.favoriteRepo.save(favorite);
  }

  async removeFavorite(propertyId: number, user: User): Promise<{ message: string }> {
    const favorite = await this.favoriteRepo.findOne({
      where: { userId: user.id, propertyId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepo.remove(favorite);
    return { message: 'Property removed from favorites' };
  }

  async getFavorites(user: User): Promise<Favorite[]> {
    return this.favoriteRepo.find({
      where: { userId: user.id },
      relations: { property: { images: true } },
      order: { createdAt: 'DESC' },
    });
  }
}
