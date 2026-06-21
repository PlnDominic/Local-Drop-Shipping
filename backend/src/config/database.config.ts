import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || '',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
}));
