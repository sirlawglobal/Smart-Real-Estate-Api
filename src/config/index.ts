import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import cloudinaryConfig from './cloudinary.config';
import aiConfig from './ai.config';

export { appConfig, databaseConfig, jwtConfig, redisConfig, cloudinaryConfig, aiConfig };

export const configurations = [
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  cloudinaryConfig,
  aiConfig,
];
