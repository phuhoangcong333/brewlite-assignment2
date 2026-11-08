import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { StaffGuard } from './staff.guard';
import { getJwtSecret } from './jwt.config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, JwtAuthGuard, StaffGuard],
  exports: [AuthService, JwtGuard, JwtAuthGuard, JwtModule, StaffGuard],
})
export class AuthModule {}
