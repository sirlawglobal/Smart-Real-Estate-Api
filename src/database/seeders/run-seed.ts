import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configurations } from '../../config';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { PropertyImage } from '../../properties/entities/property-image.entity';
import { Lead } from '../../leads/entities/lead.entity';
import { Conversation } from '../../chat/entities/conversation.entity';
import { Message } from '../../chat/entities/message.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      User,
      Property,
      PropertyImage,
      Lead,
      Conversation,
      Message,
      Favorite,
      Notification,
    ]),
  ],
  providers: [SeedService],
})
class SeedModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const seedService = app.get(SeedService);
  await seedService.seed();
  await app.close();
}

bootstrap();
