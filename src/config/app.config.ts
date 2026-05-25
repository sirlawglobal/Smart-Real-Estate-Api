import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  name: process.env.APP_NAME || 'RealEstate-AI-Platform',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  cacheTtlProperties: parseInt(process.env.CACHE_TTL_PROPERTIES || '300', 10),
  cacheTtlDashboard: parseInt(process.env.CACHE_TTL_DASHBOARD || '60', 10),
}));
