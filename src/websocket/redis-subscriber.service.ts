import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisSubscriberService implements OnModuleInit {
  private redisSubscriber: Redis;

  constructor(
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.redisSubscriber = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password') || undefined,
    });

    this.redisSubscriber.subscribe('chat:messages', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to Redis channel', err);
      }
    });

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'chat:messages') {
        const payload = JSON.parse(message);
        this.chatGateway.server
          .to(`conversation_${payload.conversationId}`)
          .emit('newMessage', payload.message);
      }
    });
  }
}
