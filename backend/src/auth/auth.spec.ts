import {
  ConflictException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getJwtSecret } from './jwt.config';

// Unit test không cần database: Prisma được giả lập, bcrypt và JWT là bản thật.
const SECRET = 'test-secret-at-least-16-chars';

type UserRow = {
  id: number;
  email: string;
  passwordHash: string;
};

function setup() {
  const rows: UserRow[] = [];
  const prisma = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { email?: string; id?: number } }) =>
          rows.find((u) =>
            where.email !== undefined
              ? u.email === where.email
              : u.id === where.id,
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Omit<UserRow, 'id'> }) => {
        const row = { id: rows.length + 1, ...data };
        rows.push(row);
        return { id: row.id, email: row.email };
      }),
    },
  };
  const users = new UsersService(prisma as unknown as PrismaService);
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { expiresIn: '1h' },
  });
  const auth = new AuthService(users, jwt);
  const guard = new JwtAuthGuard(jwt, auth);
  return { rows, prisma, users, jwt, auth, guard };
}

function contextWith(headers: Record<string, string>) {
  const request: {
    headers: Record<string, string>;
    user?: { id: number; email: string };
  } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

describe('Task 7 - POST /auth/register', () => {
  it('chuẩn hóa email, băm mật khẩu bằng bcrypt và không trả passwordHash', async () => {
    const { auth, rows } = setup();
    const result = await auth.register({
      email: '  An@Example.COM ',
      password: '123456',
    });

    expect(result.user).toEqual({ id: 1, email: 'an@example.com' });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(rows[0].passwordHash).not.toBe('123456');
    expect(await bcrypt.compare('123456', rows[0].passwordHash)).toBe(true);
  });

  it('email đã tồn tại -> 409', async () => {
    const { auth } = setup();
    await auth.register({
      email: 'an@example.com',
      password: '123456',
    });
    await expect(
      auth.register({
        email: 'AN@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hai request cùng email chạy song song: bên thua bị unique constraint (P2002) -> 409, không phải 500', async () => {
    const { auth, prisma } = setup();
    prisma.user.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      auth.register({
        email: 'race@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lỗi DB khác không bị nuốt thành 409', async () => {
    const { auth, prisma } = setup();
    const boom = new Error('db down');
    prisma.user.create.mockRejectedValueOnce(boom);
    await expect(
      auth.register({ email: 'x@example.com', password: '123456' }),
    ).rejects.toBe(boom);
  });
});

describe('Task 7 - POST /auth/login', () => {
  it('đúng email/mật khẩu -> access_token (JWT) + thông tin user, không có passwordHash', async () => {
    const { auth, jwt } = setup();
    await auth.register({
      email: 'an@example.com',
      password: '123456',
    });
    const result = await auth.login({
      email: 'an@example.com',
      password: '123456',
    });

    expect(result.token_type).toBe('Bearer');
    expect(result.user).toEqual({ id: 1, email: 'an@example.com' });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    const payload = await jwt.verifyAsync<{
      sub: number;
      email: string;
      exp: number;
      iat: number;
    }>(result.access_token);
    expect(payload.sub).toBe(1);
    expect(payload.email).toBe('an@example.com');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('email không phân biệt hoa thường', async () => {
    const { auth } = setup();
    await auth.register({
      email: 'an@example.com',
      password: '123456',
    });
    await expect(
      auth.login({ email: ' AN@Example.com ', password: '123456' }),
    ).resolves.toHaveProperty('access_token');
  });

  it('sai mật khẩu và email không tồn tại cùng trả 401 với cùng thông báo', async () => {
    const { auth } = setup();
    await auth.register({
      email: 'an@example.com',
      password: '123456',
    });
    const wrongPassword = await auth
      .login({ email: 'an@example.com', password: 'sai-mat-khau' })
      .catch((e: unknown) => e);
    const unknownEmail = await auth
      .login({ email: 'khong-co@example.com', password: '123456' })
      .catch((e: unknown) => e);

    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
    expect((wrongPassword as UnauthorizedException).message).toBe(
      (unknownEmail as UnauthorizedException).message,
    );
  });
});

describe('Task 7 - JwtAuthGuard (không có token thì 401)', () => {
  async function tokenFor(email = 'an@example.com') {
    const s = setup();
    await s.auth.register({ email, password: '123456' });
    const { access_token } = await s.auth.login({ email, password: '123456' });
    return { ...s, token: access_token };
  }

  it('thiếu header Authorization -> 401', async () => {
    const { guard } = setup();
    await expect(
      guard.canActivate(contextWith({}).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sai scheme (Basic/không có "Bearer") hoặc thiếu token -> 401', async () => {
    const { guard, token } = await tokenFor();
    await expect(
      guard.canActivate(
        contextWith({ authorization: `Basic ${token}` }).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(contextWith({ authorization: 'Bearer' }).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token rác hoặc ký bằng secret khác -> 401', async () => {
    const { guard } = setup();
    const forged = await new JwtService({
      secret: 'another-secret-xxxxxxxx',
    }).signAsync({ sub: 1, email: 'an@example.com' });
    await expect(
      guard.canActivate(
        contextWith({ authorization: 'Bearer abc.def.ghi' }).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(
        contextWith({ authorization: `Bearer ${forged}` }).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token hết hạn -> 401', async () => {
    const { guard } = await tokenFor();
    // JwtService riêng không có signOptions.expiresIn (jsonwebtoken không cho vừa có exp trong payload vừa có expiresIn)
    const expired = await new JwtService({ secret: SECRET }).signAsync({
      sub: 1,
      email: 'an@example.com',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    await expect(
      guard.canActivate(
        contextWith({ authorization: `Bearer ${expired}` }).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token hợp lệ nhưng user đã bị xóa -> 401', async () => {
    const { guard, token, rows } = await tokenFor();
    rows.length = 0;
    await expect(
      guard.canActivate(
        contextWith({ authorization: `Bearer ${token}` }).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token hợp lệ -> cho qua và gắn request.user = { id, email }', async () => {
    const { guard, token } = await tokenFor();
    const { context, request } = contextWith({
      authorization: `Bearer ${token}`,
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 1, email: 'an@example.com' });
  });
});

describe('Task 7 - validate DTO', () => {
  const errorsOf = async <T extends object>(cls: new () => T, plain: object) =>
    (
      await validate(plainToInstance(cls, plain), {
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    ).map((e) => e.property);

  it('RegisterDto hợp lệ', async () => {
    expect(
      await errorsOf(RegisterDto, {
        email: 'an@example.com',
        password: '123456',
      }),
    ).toEqual([]);
  });
  it('RegisterDto: email sai, mật khẩu < 6 ký tự', async () => {
    expect(
      (
        await errorsOf(RegisterDto, {
          email: 'khong-phai-email',
          password: '123',
        })
      ).sort(),
    ).toEqual(['email', 'password']);
  });
  it('RegisterDto: field lạ (vd role) bị từ chối', async () => {
    expect(
      await errorsOf(RegisterDto, {
        email: 'an@example.com',
        password: '123456',
        role: 'admin',
      }),
    ).toContain('role');
  });
  it('LoginDto: thiếu field/sai định dạng bị từ chối', async () => {
    expect((await errorsOf(LoginDto, {})).sort()).toEqual([
      'email',
      'password',
    ]);
    expect(
      await errorsOf(LoginDto, { email: 'x', password: '123456' }),
    ).toEqual(['email']);
  });
});

describe('getJwtSecret (sửa lỗi dùng secret mặc định)', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('dùng JWT_SECRET khi hợp lệ', () => {
    process.env.JWT_SECRET = 'a-real-secret-123456';
    expect(getJwtSecret()).toBe('a-real-secret-123456');
  });
  it('production mà thiếu hoặc quá ngắn -> báo lỗi, không chạy với secret mặc định', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
    process.env.JWT_SECRET = 'short';
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });
  it('môi trường test/dev thiếu secret -> dùng secret dev, không throw', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    expect(getJwtSecret()).toContain('dev-only');
  });
});
