import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

// Nạp .env bằng Node có sẵn (>= 20.12), không cần thêm thư viện dotenv.
// Chạy trước NestFactory.create nên getJwtSecret() đọc được JWT_SECRET.
try {
  process.loadEnvFile();
} catch {
  // không có file .env: dùng biến môi trường của hệ thống
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());

  // Không có pipe này thì toàn bộ decorator class-validator trong DTO
  // (RegisterDto, LoginDto, CreatePaymentDto, CreateOrderDto) KHÔNG được chạy.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ field lạ
      forbidNonWhitelisted: true, // field lạ (vd role: 'admin') -> 400
      transform: true, // ép kiểu theo DTO (kể cả @Type trong CreateOrderDto)
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap().catch((error: unknown) => {
  console.error('Failed to start the application:', error);
  process.exitCode = 1;
});
