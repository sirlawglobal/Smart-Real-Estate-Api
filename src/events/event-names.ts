/**
 * EVENTS — single source of truth for all event name strings.
 * Import this constant instead of using string literals in @OnEvent() decorators
 * or eventEmitter.emit() calls. Prevents typos and makes event flow auditable.
 */
export const EVENTS = {
  // Auth
  USER_REGISTERED: 'user.registered',
  AUTH_FORGOT_PASSWORD: 'auth.forgot-password',

  // Leads
  LEAD_CREATED: 'lead.created',
  LEAD_QUALIFIED: 'lead.qualified',

  // Properties
  PROPERTY_CREATED: 'property.created',
  PROPERTY_APPROVED: 'property.approved',
  PROPERTY_REJECTED: 'property.rejected',

  // Chat
  CHAT_MESSAGE_SENT: 'chat.message_sent',

  // Users
  USER_ROLE_CHANGED: 'user.role_changed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
