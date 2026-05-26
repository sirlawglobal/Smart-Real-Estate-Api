import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @Public()
  async check() {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - startTime;
      return {
        status: 'UP',
        database: 'CONNECTED',
        pingTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Return 503 so uptime monitors (Render, UptimeRobot, Datadog, etc.)
      // correctly detect an outage instead of seeing 200 OK.
      throw new HttpException(
        {
          status: 'DOWN',
          database: 'DISCONNECTED',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

