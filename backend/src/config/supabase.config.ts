import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co',
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'service-role-key-secret',
  jwtSecret: process.env.SUPABASE_JWT_SECRET || 'jwt-key-for-auth',
  bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'product-images',
}));
