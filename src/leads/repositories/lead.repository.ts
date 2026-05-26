import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../repository/base.repository';
import { Lead } from '../entities/lead.entity';

@Injectable()
export class LeadRepository extends BaseRepository<Lead> {
  constructor(
    @InjectRepository(Lead)
    repo: Repository<Lead>,
  ) {
    super(repo);
  }
}
