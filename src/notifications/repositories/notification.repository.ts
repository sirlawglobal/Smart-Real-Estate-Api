import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(
    @InjectRepository(Notification)
    repo: Repository<Notification>,
  ) {
    super(repo);
  }

  async findByUser(userId: number): Promise<Notification[]> {
    return this.findAll({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }
}
