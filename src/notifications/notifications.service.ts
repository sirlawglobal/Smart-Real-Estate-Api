import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async getNotifications(user: User): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: number, user: User): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId: user.id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification #${id} not found`);
    }

    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(user: User): Promise<{ message: string }> {
    await this.notificationRepo.update(
      { userId: user.id, read: false },
      { read: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async createNotification(userId: number, title: string, message: string): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId,
      title,
      message,
    });
    return this.notificationRepo.save(notification);
  }

  // --- Event Listeners ---

  @OnEvent('lead.created')
  async handleLeadCreatedEvent(payload: any) {
    const lead = payload.lead;
    if (lead.assignedAgentId) {
      await this.createNotification(
        lead.assignedAgentId,
        'New Lead Assigned',
        `You have a new lead for ${lead.customerName}`,
      );
    }
  }

  @OnEvent('property.approved')
  async handlePropertyApprovedEvent(payload: any) {
    const property = payload.property;
    await this.createNotification(
      property.createdById,
      'Property Approved',
      `Your property "${property.title}" has been approved`,
    );
  }

  @OnEvent('property.rejected')
  async handlePropertyRejectedEvent(payload: any) {
    const property = payload.property;
    await this.createNotification(
      property.createdById,
      'Property Rejected',
      `Your property "${property.title}" was rejected. Reason: ${property.rejectionReason}`,
    );
  }

  @OnEvent('chat.message_sent')
  async handleChatMessageSentEvent(payload: any) {
    // Ideally we notify the other participant. For MVP we can skip or implement basic logic.
  }

  @OnEvent('user.role_changed')
  async handleRoleChangedEvent(payload: any) {
    const user = payload.user;
    await this.createNotification(
      user.id,
      'Role Updated',
      `Your account role has been updated to ${user.role}`,
    );
  }
}
