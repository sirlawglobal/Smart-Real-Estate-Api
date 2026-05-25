import { Controller, Get } from '@nestjs/common';
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
      // Run a simple query to check connectivity and keep the DB warm
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - startTime;
      return {
        status: 'UP',
        database: 'CONNECTED',
        pingTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
