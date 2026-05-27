import { Injectable, ConflictException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findByEmail(createUserDto.email);
    if (existing) throw new ConflictException('Email already in use');

    return this.userRepo.createAndSave({
      ...createUserDto,
      role: UserRole.BUYER,
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.findAll({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<User> {
    return this.userRepo.findByIdOrFail(id, 'User');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    return this.userRepo.findByResetToken(resetToken);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userRepo.update(id, updateUserDto);
  }

  async updateRole(id: number, role: UserRole): Promise<User> {
    return this.userRepo.update(id, { role } as any);
  }

  async setActive(id: number, isActive: boolean): Promise<User> {
    return this.userRepo.update(id, { isActive } as any);
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.userRepo.countByRole(role);
  }

  async countAll(): Promise<number> {
    return this.userRepo.count();
  }

  async findRecent(limit: number): Promise<User[]> {
    return this.userRepo.findAll({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
