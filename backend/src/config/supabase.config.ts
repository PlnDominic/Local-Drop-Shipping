import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  jwtSecret: process.env.SUPABASE_JWT_SECRET,
  bucketName: process.env.SUPABASE_STORAGE_BUCKET,
}));
