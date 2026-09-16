import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // External services
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  hubtelClientId: process.env.HUBTEL_CLIENT_ID,
  hubtelClientSecret: process.env.HUBTEL_CLIENT_SECRET,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  momoSubscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
  gpgpsApiURL: process.env.GPGPS_apiURL,
  gpgpsAuthorization: process.env.GPGPS_authorization,
  gpgpsAsaaseUser: process.env.GPGPS_asaaseUser,
  gpgpsLanguageCode: process.env.GPGPS_languageCode,
  gpgpsLanguage: process.env.GPGPS_language,
  gpgpsDeviceId: process.env.GPGPS_deviceId,
  gpgpsAndroidCert: process.env.GPGPS_androidCert,
  gpgpsAndroidPackage: process.env.GPGPS_androidPackage,
  gpgpsCountryName: process.env.GPGPS_countryName,
  gpgpsCountry: process.env.GPGPS_country,
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '2'),
}));
