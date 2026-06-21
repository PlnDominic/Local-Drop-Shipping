import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'local-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // External services
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  hubtelClientId: process.env.HUBTEL_CLIENT_ID || '',
  hubtelClientSecret: process.env.HUBTEL_CLIENT_SECRET || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  momoSubscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || '',
  ghanaPostApiKey: process.env.GHANAPOST_API_KEY || '',
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '2'),
}));
