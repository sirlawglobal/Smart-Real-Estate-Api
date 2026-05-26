import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { UserRole } from '../users/enums/user-role.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../events/event-names';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly propertiesService: PropertiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async getUserById(id: number) {
    return this.usersService.findOne(id);
  }

  async updateUserRole(id: number, role: UserRole) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);

    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    const updated = await this.usersService.updateRole(id, role);
    this.eventEmitter.emit(EVENTS.USER_ROLE_CHANGED, { user: updated });
    return updated;
  }

  async activateUser(id: number) {
    return this.usersService.setActive(id, true);
  }

  async deactivateUser(id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot deactivate the last admin');
      }
    }
    return this.usersService.setActive(id, false);
  }

  async getPendingProperties() {
    return this.propertiesService.findPending();
  }

  async approveProperty(id: number) {
    return this.propertiesService.approve(id);
  }

  async rejectProperty(id: number, reason: string) {
    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }
    return this.propertiesService.reject(id, reason);
  }
}
