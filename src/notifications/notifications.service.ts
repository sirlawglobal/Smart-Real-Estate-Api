import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationRepository } from './repositories/notification.repository';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EVENTS } from '../events/event-names';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationRepo: NotificationRepository) {}

  async getNotifications(user: User): Promise<Notification[]> {
    return this.notificationRepo.findByUser(user.id);
  }

  async markAsRead(id: number, user: User): Promise<Notification> {
    const notification = await this.notificationRepo.findByWhere({
      id,
      userId: user.id,
    } as any);
    if (!notification) throw new NotFoundException(`Notification #${id} not found`);

    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(user: User): Promise<{ message: string }> {
    await this.notificationRepo.updateWhere(
      { userId: user.id, read: false } as any,
      { read: true } as any,
    );
    return { message: 'All notifications marked as read' };
  }

  async createNotification(userId: number, title: string, message: string): Promise<Notification> {
    return this.notificationRepo.createAndSave({ userId, title, message });
  }

  // ── Event Listeners ───────────────────────────────────────────────────────

  @OnEvent(EVENTS.LEAD_CREATED)
  async handleLeadCreatedEvent(payload: any) {
    const { lead } = payload;
    if (lead.assignedAgentId) {
      await this.createNotification(
        lead.assignedAgentId,
        'New Lead Assigned',
        `You have a new lead for ${lead.customerName}`,
      );
    }
  }

  @OnEvent(EVENTS.PROPERTY_APPROVED)
  async handlePropertyApprovedEvent(payload: any) {
    const { property } = payload;
    await this.createNotification(
      property.createdById,
      'Property Approved',
      `Your property "${property.title}" has been approved`,
    );
  }

  @OnEvent(EVENTS.PROPERTY_REJECTED)
  async handlePropertyRejectedEvent(payload: any) {
    const { property } = payload;
    await this.createNotification(
      property.createdById,
      'Property Rejected',
      `Your property "${property.title}" was rejected. Reason: ${property.rejectionReason}`,
    );
  }

  @OnEvent(EVENTS.CHAT_MESSAGE_SENT)
  async handleChatMessageSentEvent(_payload: any) {
    // Reserved for future real-time notification implementation
  }

  @OnEvent(EVENTS.USER_ROLE_CHANGED)
  async handleRoleChangedEvent(payload: any) {
    const { user } = payload;
    await this.createNotification(
      user.id,
      'Role Updated',
      `Your account role has been updated to ${user.role}`,
    );
  }
}
