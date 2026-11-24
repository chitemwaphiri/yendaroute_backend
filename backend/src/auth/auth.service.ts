
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';

import { User } from './entities/user.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private users: Repository<User>,

    @InjectRepository(TokenBlacklist)
    private blacklist: Repository<TokenBlacklist>,

    @InjectRepository(RefreshToken)
    private refreshTokens: Repository<RefreshToken>,

    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.users.create({
      fullName: dto.name,
      email: dto.email,
      phoneNumber: dto.phone || null,
      passwordHash,
    });

    await this.users.save(user);

    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sign(user);
  }

  async me(userId: number) {
    return this.users.findOne({
      where: { id: userId },
    });
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;

    try {
      payload = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Ensure this is a refresh token, not an access token.
    if (payload.tokenType !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    // Find the hashed token in the database.
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokens.findOne({
      where: { tokenHash },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token has expired or been revoked',
      );
    }

    const user = await this.users.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke the old refresh token before issuing a new pair.
    storedToken.revokedAt = new Date();
    await this.refreshTokens.save(storedToken);

    return this.sign(user);
  }

  async logout(userId: number, token: string) {
    if (token) {
      const existing = await this.blacklist.findOne({
        where: { token },
      });

      if (!existing) {
        await this.blacklist.save(
          this.blacklist.create({ token }),
        );
      }
    }

    // Revoke all active refresh tokens belonging to this user.
    await this.refreshTokens.update(
      {
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );

    return {
      message: 'Logged out successfully',
    };
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return !!(await this.blacklist.findOne({
      where: { token },
    }));
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private async sign(user: User) {
    const refreshDays = Number(process.env.JWT_REFRESH_DAYS || 7);

    if (!Number.isInteger(refreshDays) || refreshDays <= 0) {
      throw new Error('JWT_REFRESH_DAYS must be a positive integer');
    }

    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Access token lasts one hour.
    const accessToken = this.jwt.sign(
      {
        ...basePayload,
        tokenType: 'access',
      },
      {
        expiresIn: 60 * 60,
      },
    );

    // Refresh token lasts the configured number of days.
    const refreshToken = this.jwt.sign(
      {
        ...basePayload,
        tokenType: 'refresh',
        jti: randomUUID(),
      },
      {
        expiresIn: refreshDays * 24 * 60 * 60,
      },
    );

    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + refreshDays * 24 * 60 * 60 * 1000,
    );

    // Store only the hash, never the original refresh token.
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        revokedAt: null,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
