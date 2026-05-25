import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController, AnalyticsController } from './dashboard.controller';
import { UsersModule } from '../users/users.module';
import { PropertiesModule } from '../properties/properties.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [UsersModule, PropertiesModule, LeadsModule],
  controllers: [DashboardController, AnalyticsController],
  providers: [DashboardService],
})
export class DashboardModule {}
