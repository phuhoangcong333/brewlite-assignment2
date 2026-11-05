import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

// P2002: vi phạm unique constraint (vd: trùng email).
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) throw new ConflictException('Email đã được đăng ký');
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await this.prisma.user.create({
        data: { email: normalizedEmail, passwordHash },
        select: { id: true, email: true },
      });
    } catch (error) {
      // Hai request đăng ký cùng email chạy song song: cả hai cùng qua bước kiểm tra
      // ở trên, request thứ hai bị unique constraint chặn -> trả 409 thay vì 500.
      if (isUniqueViolation(error))
        throw new ConflictException('Email đã được đăng ký');
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
  }
}
