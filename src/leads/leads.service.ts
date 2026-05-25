import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { LeadStatus, LeadPriority } from './enums/lead.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { paginate } from '../common/utils/pagination.util';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly propertiesService: PropertiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepo.create(dto);

    if (dto.propertyId) {
      const property = await this.propertiesService.findOne(dto.propertyId);
      lead.assignedAgentId = property.createdById;
    }

    const saved = await this.leadRepo.save(lead);
    
    // Trigger AI qualification event
    this.eventEmitter.emit('lead.created', { lead: saved });
    
    return saved;
  }

  async findAll(filter: LeadFilterDto, user: User) {
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.property', 'property')
      .leftJoinAndSelect('lead.assignedAgent', 'assignedAgent');

    // Agents can only see their leads
    if (user.role === UserRole.AGENT) {
      qb.andWhere('lead.assignedAgentId = :userId', { userId: user.id });
    } else if (filter.assignedAgentId && user.role === UserRole.ADMIN) {
      qb.andWhere('lead.assignedAgentId = :agentId', { agentId: filter.assignedAgentId });
    }

    if (filter.status) {
      qb.andWhere('lead.status = :status', { status: filter.status });
    }
    
    if (filter.priority) {
      qb.andWhere('lead.priority = :priority', { priority: filter.priority });
    }

    if (filter.propertyId) {
      qb.andWhere('lead.propertyId = :propertyId', { propertyId: filter.propertyId });
    }

    qb.orderBy('lead.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: number, user?: User): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id },
      relations: { property: true, assignedAgent: true },
    });

    if (!lead) throw new NotFoundException(`Lead #${id} not found`);

    if (user && user.role === UserRole.AGENT && lead.assignedAgentId !== user.id) {
      throw new ForbiddenException('You can only access your own leads');
    }

    return lead;
  }

  async updateStatus(id: number, dto: UpdateLeadStatusDto, user: User): Promise<Lead> {
    const lead = await this.findOne(id, user);
    lead.status = dto.status;
    return this.leadRepo.save(lead);
  }

  async getMyLeads(user: User, filter: LeadFilterDto) {
    // Force agent id filter
    return this.findAll({ ...filter, assignedAgentId: user.id }, user);
  }

  async getHotLeads(user: User, filter: LeadFilterDto) {
    return this.findAll({ ...filter, priority: LeadPriority.HOT }, user);
  }

  async updateScoreAndPriority(id: number, score: number, priority: LeadPriority) {
    const lead = await this.leadRepo.findOne({ where: { id } });
    if (lead) {
      lead.score = score;
      lead.priority = priority;
      
      if (priority === LeadPriority.HOT) {
        this.eventEmitter.emit('lead.qualified', { lead });
      }
      
      await this.leadRepo.save(lead);
    }
  }

  async countAll(): Promise<number> {
    return this.leadRepo.count();
  }
}
