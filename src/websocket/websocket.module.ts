import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { RedisSubscriberService } from './redis-subscriber.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [ChatGateway, RedisSubscriberService],
  exports: [ChatGateway],
})
export class WebsocketModule {}
