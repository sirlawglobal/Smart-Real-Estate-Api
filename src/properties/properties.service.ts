import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyFilterDto } from './dto/property-filter.dto';
import { ApprovalStatus } from './enums/property.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CacheService } from '../cache/cache.service';
import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(PropertyImage)
    private readonly imageRepo: Repository<PropertyImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreatePropertyDto, user: User): Promise<Property> {
    if (user.role === UserRole.BUYER) {
      throw new ForbiddenException('Only agents and admins can create properties');
    }

    const property = this.propertyRepo.create({
      ...dto,
      createdBy: user,
      createdById: user.id,
      approvalStatus: ApprovalStatus.PENDING,
    });

    const saved = await this.propertyRepo.save(property);
    await this.cacheService.delByPattern('properties:*');
    this.eventEmitter.emit('property.created', { property: saved, user });
    return saved;
  }

  async findAll(filter: PropertyFilterDto) {
    const cacheKey = `properties:list:${JSON.stringify(filter)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = filter;
    const skip = (page - 1) * limit;

    const qb = this.propertyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.createdBy', 'createdBy')
      .where('p.approvalStatus = :status', { status: ApprovalStatus.APPROVED })
      .andWhere('p.deletedAt IS NULL');

    this.applyFilters(qb, filter);

    qb.orderBy(`p.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const result = paginate(data, total, page, limit);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async findOne(id: number): Promise<Property> {
    const cacheKey = `properties:detail:${id}`;
    const cached = await this.cacheService.get<Property>(cacheKey);
    if (cached) return cached;

    const property = await this.propertyRepo.findOne({
      where: { id },
      relations: { images: true, createdBy: true },
    });
    if (!property) throw new NotFoundException(`Property #${id} not found`);

    await this.cacheService.set(cacheKey, property, 300);
    return property;
  }

  async findByAgent(userId: number, filter: PropertyFilterDto) {
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const [data, total] = await this.propertyRepo.findAndCount({
      where: { createdById: userId },
      relations: { images: true },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      withDeleted: false,
    });

    return paginate(data, total, page, limit);
  }

  async search(filter: PropertyFilterDto) {
    return this.findAll(filter);
  }

  async getFeatured(): Promise<Property[]> {
    const cacheKey = 'properties:featured';
    const cached = await this.cacheService.get<Property[]>(cacheKey);
    if (cached) return cached;

    const featured = await this.propertyRepo.find({
      where: { featured: true, approvalStatus: ApprovalStatus.APPROVED },
      relations: { images: true, createdBy: true },
      take: 10,
      order: { createdAt: 'DESC' },
    });

    await this.cacheService.set(cacheKey, featured, 300);
    return featured;
  }

  async update(id: number, dto: Partial<CreatePropertyDto>, user: User): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException(`Property #${id} not found`);

    if (user.role !== UserRole.ADMIN && property.createdById !== user.id) {
      throw new ForbiddenException('You can only update your own properties');
    }

    Object.assign(property, dto);
    const saved = await this.propertyRepo.save(property);
    await this.invalidateCache(id);
    return saved;
  }

  async remove(id: number, user: User): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException(`Property #${id} not found`);

    if (user.role !== UserRole.ADMIN && property.createdById !== user.id) {
      throw new ForbiddenException('You can only delete your own properties');
    }

    await this.propertyRepo.softDelete(id);
    await this.invalidateCache(id);
    return { message: 'Property deleted successfully' };
  }

  async addImages(
    propertyId: number,
    files: Express.Multer.File[],
    user: User,
  ): Promise<PropertyImage[]> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException(`Property #${propertyId} not found`);

    if (user.role !== UserRole.ADMIN && property.createdById !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    const uploadResults = await this.cloudinaryService.uploadMultipleImages(
      files,
      'real-estate/properties',
    );

    const images = uploadResults.map((result) =>
      this.imageRepo.create({
        propertyId,
        imageUrl: result.url,
        publicId: result.publicId,
      }),
    );

    const saved = await this.imageRepo.save(images);
    await this.invalidateCache(propertyId);
    return saved;
  }

  async removeImage(
    propertyId: number,
    imageId: number,
    user: User,
  ): Promise<{ message: string }> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException(`Property #${propertyId} not found`);

    if (user.role !== UserRole.ADMIN && property.createdById !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    const image = await this.imageRepo.findOne({
      where: { id: imageId, propertyId },
    });
    if (!image) throw new NotFoundException(`Image #${imageId} not found`);

    if (image.publicId) {
      await this.cloudinaryService.deleteImage(image.publicId);
    }

    await this.imageRepo.remove(image);
    await this.invalidateCache(propertyId);
    return { message: 'Image removed successfully' };
  }

  async approve(id: number): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException(`Property #${id} not found`);

    property.approvalStatus = ApprovalStatus.APPROVED;
    property.rejectionReason = '';
    const saved = await this.propertyRepo.save(property);
    await this.invalidateCache(id);

    this.eventEmitter.emit('property.approved', { property: saved });
    return saved;
  }

  async reject(id: number, reason?: string): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException(`Property #${id} not found`);

    property.approvalStatus = ApprovalStatus.REJECTED;
    property.rejectionReason = reason || 'Does not meet listing standards';
    const saved = await this.propertyRepo.save(property);
    await this.invalidateCache(id);

    this.eventEmitter.emit('property.rejected', { property: saved });
    return saved;
  }

  async findPending(): Promise<Property[]> {
    return this.propertyRepo.find({
      where: { approvalStatus: ApprovalStatus.PENDING },
      relations: { images: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async countAll(): Promise<number> {
    return this.propertyRepo.count();
  }

  async findForRecommendations(filters: {
    city?: string;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
  }): Promise<Property[]> {
    const qb = this.propertyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.approvalStatus = :status', { status: ApprovalStatus.APPROVED })
      .andWhere('p.deletedAt IS NULL');

    if (filters.city) {
      qb.andWhere('p.city LIKE :city', { city: `%${filters.city}%` });
    }
    if (filters.maxPrice) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.bedrooms) {
      qb.andWhere('p.bedrooms >= :bedrooms', { bedrooms: filters.bedrooms });
    }
    if (filters.propertyType) {
      qb.andWhere('p.propertyType = :type', { type: filters.propertyType.toUpperCase() });
    }

    return qb.take(10).getMany();
  }

  private applyFilters(qb: any, filter: PropertyFilterDto) {
    if (filter.city) {
      qb.andWhere('p.city LIKE :city', { city: `%${filter.city}%` });
    }
    if (filter.state) {
      qb.andWhere('p.state LIKE :state', { state: `%${filter.state}%` });
    }
    if (filter.minPrice) {
      qb.andWhere('p.price >= :minPrice', { minPrice: filter.minPrice });
    }
    if (filter.maxPrice) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: filter.maxPrice });
    }
    if (filter.bedrooms) {
      qb.andWhere('p.bedrooms >= :bedrooms', { bedrooms: filter.bedrooms });
    }
    if (filter.bathrooms) {
      qb.andWhere('p.bathrooms >= :bathrooms', { bathrooms: filter.bathrooms });
    }
    if (filter.propertyType) {
      qb.andWhere('p.propertyType = :propertyType', { propertyType: filter.propertyType });
    }
    if (filter.listingType) {
      qb.andWhere('p.listingType = :listingType', { listingType: filter.listingType });
    }
    if (filter.search) {
      qb.andWhere(
        '(p.title LIKE :search OR p.description LIKE :search OR p.city LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }
  }

  private async invalidateCache(id: number) {
    await Promise.all([
      this.cacheService.del(`properties:detail:${id}`),
      this.cacheService.delByPattern('properties:list:*'),
      this.cacheService.del('properties:featured'),
    ]);
  }
}
