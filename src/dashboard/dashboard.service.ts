import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { LeadsService } from '../leads/leads.service';
import { CacheService } from '../cache/cache.service';
import { UserRole } from '../users/enums/user-role.enum';
import { LeadStatus } from '../leads/enums/lead.enum';

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly propertiesService: PropertiesService,
    private readonly leadsService: LeadsService,
    private readonly cacheService: CacheService,
  ) {}

  async getStats() {
    const cacheKey = 'dashboard:stats';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      totalProperties,
      totalLeads,
      totalAgents,
      totalBuyers,
    ] = await Promise.all([
      this.usersService.countAll(),
      this.propertiesService.countAll(),
      this.leadsService.countAll(),
      this.usersService.countByRole(UserRole.AGENT),
      this.usersService.countByRole(UserRole.BUYER),
    ]);

    const stats = {
      totalUsers,
      totalProperties,
      totalLeads,
      totalAgents,
      totalBuyers,
    };

    await this.cacheService.set(cacheKey, stats, 60); // Cache for 60 seconds
    return stats;
  }

  async getRecentActivities() {
    const cacheKey = 'dashboard:recent_activities';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [recentProperties, recentLeads, recentUsers] = await Promise.all([
      this.propertiesService.findRecent(5),
      this.leadsService.findRecent(5),
      this.usersService.findRecent(5),
    ]);

    const activities: any[] = [];

    recentProperties.forEach(p => {
      activities.push({
        type: 'property_created',
        message: `New property listed: "${p.title}" in ${p.city}`,
        timestamp: p.createdAt,
      });
    });

    recentLeads.forEach(l => {
      activities.push({
        type: 'lead_created',
        message: `New lead created for property: "${l.property?.title || 'Unknown Property'}" by ${l.customerName}`,
        timestamp: l.createdAt,
      });
    });

    recentUsers.forEach(u => {
      activities.push({
        type: 'user_registered',
        message: `New user registered: ${u.firstName} ${u.lastName} (${u.role})`,
        timestamp: u.createdAt,
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Take top 5
    const topActivities = activities.slice(0, 5);

    await this.cacheService.set(cacheKey, topActivities, 60);
    return topActivities;
  }

  async getLeadAnalytics() {
    const [newLeads, qualifiedLeads, closedLeads, totalLeads] = await Promise.all([
      this.leadsService.countByStatus(LeadStatus.NEW),
      this.leadsService.countByStatus(LeadStatus.QUALIFIED),
      this.leadsService.countByStatus(LeadStatus.CLOSED),
      this.leadsService.countAll(),
    ]);

    const conversionRate = totalLeads > 0 
      ? parseFloat(((closedLeads / totalLeads) * 100).toFixed(1)) 
      : 0;

    return {
      newLeads,
      qualifiedLeads,
      closedLeads,
      conversionRate,
    };
  }
}
