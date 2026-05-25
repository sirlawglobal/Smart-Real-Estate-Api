import { Controller, Get, Patch, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiBody({ schema: { example: { role: 'AGENT' } } })
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  activateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activateUser(id);
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  deactivateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deactivateUser(id);
  }

  @Get('properties/pending')
  @ApiOperation({ summary: 'Get pending properties' })
  getPendingProperties() {
    return this.adminService.getPendingProperties();
  }

  @Patch('properties/:id/approve')
  @ApiOperation({ summary: 'Approve property' })
  approveProperty(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveProperty(id);
  }

  @Patch('properties/:id/reject')
  @ApiOperation({ summary: 'Reject property' })
  @ApiBody({ schema: { example: { reason: 'Images are too blurry' } } })
  rejectProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectProperty(id, reason);
  }
}
