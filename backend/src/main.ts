import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix matching rest docs: /v1
  app.setGlobalPrefix('v1');
  
  // Enforce DTO validation constraints
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true
  }));
  
  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Enable local frontend cross-origin requests
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`LocalDropshipping NestJS Monolith running on port ${port}`);
}
bootstrap();
