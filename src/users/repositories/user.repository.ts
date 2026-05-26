import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repo: Repository<User>,
  ) {
    super(repo);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByWhere({ email } as any);
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    return this.findByWhere({ resetToken } as any);
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.count({ role } as any);
  }
}
