import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  checkDatabase(): Promise<unknown> {
    if (!this.prisma) {
      return Promise.reject(new Error('PrismaService is unavailable'));
    }
    return this.prisma.$queryRaw`SELECT 1`;
  }
}
