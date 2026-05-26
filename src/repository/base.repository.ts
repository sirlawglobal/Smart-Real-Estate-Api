import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  FindOptionsWhere,
  DeepPartial,
  ObjectLiteral,
  UpdateResult,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';

/**
 * BaseRepository<T>
 * ─────────────────
 * Generic TypeORM repository wrapper. Every domain repository should extend
 * this class instead of injecting Repository<T> directly in a service.
 *
 * Benefits:
 *  • Single place for common CRUD operations
 *  • Services stay thin – they only add domain-specific logic
 *  • Easy to mock in unit-tests (swap the subclass)
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(protected readonly repo: Repository<T>) {}

  // ── Creation ──────────────────────────────────────────────────────────────

  create(data: DeepPartial<T>): T {
    return this.repo.create(data);
  }

  async save(entity: T): Promise<T> {
    return this.repo.save(entity);
  }

  async createAndSave(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  async findAllAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repo.findAndCount(options);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repo.findOne(options);
  }

  async findById(id: number, options?: FindOneOptions<T>): Promise<T | null> {
    return this.repo.findOne({ where: { id } as any, ...options });
  }

  async findByIdOrFail(id: number, entityName?: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundException(`${entityName ?? 'Entity'} #${id} not found`);
    }
    return entity;
  }

  async findByWhere(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repo.findOne({ where });
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findByIdOrFail(id);
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async updateWhere(
    where: FindOptionsWhere<T>,
    data: DeepPartial<T>,
  ): Promise<UpdateResult> {
    return this.repo.update(where as any, data as any);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.softDelete(id);
  }

  async hardDelete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async remove(entity: T): Promise<T> {
    return this.repo.remove(entity);
  }

  // ── Counts ────────────────────────────────────────────────────────────────

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repo.count({ where });
  }

  // ── Query builder shortcut ────────────────────────────────────────────────

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
