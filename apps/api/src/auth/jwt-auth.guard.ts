import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email: string;
    role: 'CUSTOMER' | 'STAFF';
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Thiếu access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(token, { algorithms: ['HS256'] });
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) return undefined;

    return token;
  }
}
