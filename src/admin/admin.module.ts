import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [UsersModule, PropertiesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
