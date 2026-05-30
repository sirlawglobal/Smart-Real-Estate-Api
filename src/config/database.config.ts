import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'realestate_db',
  sslCa: process.env.DB_SSL_CA || undefined,
  sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
  synchronize: process.env.DB_SYNCHRONIZE ? process.env.DB_SYNCHRONIZE === 'true' : process.env.NODE_ENV === 'development',
}));
