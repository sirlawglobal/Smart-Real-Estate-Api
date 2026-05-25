import { Controller, Get, Post, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  @ApiOperation({ summary: 'Add property to favorites' })
  addFavorite(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() user: User,
  ) {
    return this.favoritesService.addFavorite(propertyId, user);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove property from favorites' })
  removeFavorite(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() user: User,
  ) {
    return this.favoritesService.removeFavorite(propertyId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all favorite properties for current user' })
  getFavorites(@CurrentUser() user: User) {
    return this.favoritesService.getFavorites(user);
  }
}
