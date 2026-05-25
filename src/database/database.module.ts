import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('database.host');
        const port = configService.get<number>('database.port');
        const username = configService.get<string>('database.username');
        const password = configService.get<string>('database.password');
        const database = configService.get<string>('database.database');
        const sslCa = configService.get<string>('database.sslCa');
        const sslRejectUnauthorized = configService.get<boolean>('database.sslRejectUnauthorized');

        let ssl: any = undefined;
        if (sslCa) {
          let caContent: string | Buffer = sslCa;
          try {
            if (fs.existsSync(sslCa)) {
              caContent = fs.readFileSync(sslCa);
            }
          } catch (e) {
            // Ignore error and use as raw string
          }
          ssl = {
            ca: caContent,
            rejectUnauthorized: sslRejectUnauthorized,
          };
        }

        return {
          type: 'mysql',
          host,
          port,
          username,
          password,
          database,
          ssl,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: configService.get<string>('app.nodeEnv') === 'development',
          logging: configService.get<string>('app.nodeEnv') === 'development',
          charset: 'utf8mb4',
          timezone: 'Z',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
