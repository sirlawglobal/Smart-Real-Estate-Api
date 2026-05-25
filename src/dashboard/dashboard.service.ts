import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { LeadsService } from '../leads/leads.service';
import { CacheService } from '../cache/cache.service';
import { UserRole } from '../users/enums/user-role.enum';

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
    // This is a placeholder for real recent activities
    // In a real app, this could come from an audit log table or aggregated recent rows
    const cacheKey = 'dashboard:recent_activities';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Simulate fetching recent activities
    const activities = [
      { type: 'property_created', message: 'New property listed in Lekki', timestamp: new Date() },
      { type: 'lead_created', message: 'New lead for Property #1', timestamp: new Date() },
      { type: 'message_received', message: 'New message from John Doe', timestamp: new Date() },
      { type: 'property_approved', message: 'Property #5 has been approved', timestamp: new Date() },
    ];

    await this.cacheService.set(cacheKey, activities, 60);
    return activities;
  }

  async getLeadAnalytics() {
    // Mock analytics
    return {
      newLeads: 45,
      qualifiedLeads: 20,
      closedLeads: 5,
      conversionRate: 11.1, // 5 / 45
    };
  }
}
