import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FavoriteRepository } from './repositories/favorite.repository';
import { PropertiesService } from '../properties/properties.service';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository,
    private readonly propertiesService: PropertiesService,
  ) {}

  async addFavorite(propertyId: number, user: User): Promise<Favorite> {
    await this.propertiesService.findOne(propertyId); // throws if not found

    const existing = await this.favoriteRepo.findByUserAndProperty(user.id, propertyId);
    if (existing) throw new ConflictException('Property is already in your favorites');

    return this.favoriteRepo.createAndSave({ userId: user.id, propertyId });
  }

  async removeFavorite(propertyId: number, user: User): Promise<{ message: string }> {
    const favorite = await this.favoriteRepo.findByUserAndProperty(user.id, propertyId);
    if (!favorite) throw new NotFoundException('Favorite not found');

    await this.favoriteRepo.remove(favorite);
    return { message: 'Property removed from favorites' };
  }

  async getFavorites(user: User): Promise<Favorite[]> {
    return this.favoriteRepo.findByUser(user.id);
  }
}
