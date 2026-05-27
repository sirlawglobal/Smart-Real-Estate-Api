import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadRepository } from './repositories/lead.repository';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { LeadPriority, LeadStatus } from './enums/lead.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { paginate } from '../common/utils/pagination.util';
import { PropertiesService } from '../properties/properties.service';
import { EVENTS } from '../events/event-names';

@Injectable()
export class LeadsService {
  constructor(
    private readonly leadRepo: LeadRepository,
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
    this.eventEmitter.emit(EVENTS.LEAD_CREATED, { lead: saved });
    return saved;
  }

  async findAll(filter: LeadFilterDto, user: User) {
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.property', 'property')
      .leftJoinAndSelect('lead.assignedAgent', 'assignedAgent');

    if (user.role === UserRole.AGENT) {
      qb.andWhere('lead.assignedAgentId = :userId', { userId: user.id });
    } else if (filter.assignedAgentId && user.role === UserRole.ADMIN) {
      qb.andWhere('lead.assignedAgentId = :agentId', { agentId: filter.assignedAgentId });
    }

    if (filter.status) qb.andWhere('lead.status = :status', { status: filter.status });
    if (filter.priority) qb.andWhere('lead.priority = :priority', { priority: filter.priority });
    if (filter.propertyId) qb.andWhere('lead.propertyId = :propertyId', { propertyId: filter.propertyId });

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
    return this.findAll({ ...filter, assignedAgentId: user.id }, user);
  }

  async getHotLeads(user: User, filter: LeadFilterDto) {
    return this.findAll({ ...filter, priority: LeadPriority.HOT }, user);
  }

  async updateScoreAndPriority(id: number, score: number, priority: LeadPriority) {
    const lead = await this.leadRepo.findById(id);
    if (lead) {
      lead.score = score;
      lead.priority = priority;

      if (priority === LeadPriority.HOT) {
        this.eventEmitter.emit(EVENTS.LEAD_QUALIFIED, { lead });
      }

      await this.leadRepo.save(lead);
    }
  }

  async countAll(): Promise<number> {
    return this.leadRepo.count();
  }

  async countByStatus(status: LeadStatus): Promise<number> {
    return this.leadRepo.count({ status });
  }

  async findRecent(limit: number): Promise<Lead[]> {
    return this.leadRepo.findAll({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { property: true },
    });
  }
}
