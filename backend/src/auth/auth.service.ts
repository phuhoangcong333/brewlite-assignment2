import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

const BCRYPT_ROUNDS = 12;

// Hash giả để email không tồn tại cũng tốn thời gian bcrypt như sai mật khẩu,
// tránh lộ "email này có đăng ký hay chưa" qua thời gian phản hồi.
let dummyHash: Promise<string> | undefined;
const getDummyHash = (): Promise<string> =>
  (dummyHash ??= bcrypt.hash('brewlite-dummy-password', BCRYPT_ROUNDS));

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(
      dto.email,
      dto.password,
    );
    return { message: 'Đăng ký thành công', user };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? (await getDummyHash()),
    );
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return {
      access_token: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      }),
      token_type: 'Bearer',
      user: { id: user.id, email: user.email },
    };
  }

  async validateUser(userId: number) {
    return this.usersService.findById(userId);
  }
}