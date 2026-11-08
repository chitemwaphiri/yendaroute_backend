import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { RoleRequest, RequestType, RequestStatus } from './entities/role-request.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(TokenBlacklist) private blacklist: Repository<TokenBlacklist>,
    @InjectRepository(RoleRequest) private roleRequests: Repository<RoleRequest>,
    @InjectRepository(RefreshToken) private refreshTokens: Repository<RefreshToken>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.users.create({
      fullName: dto.name,
      email: dto.email,
      phoneNumber: dto.phone ?? null,
      passwordHash,
    });
    await this.users.save(user);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  // Swap a valid refresh token for a fresh set of tokens
  async refresh(refreshToken: string) {
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: this.hash(refreshToken) },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      // A used token came back: assume it leaked and end every session
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('Refresh token already used');
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    stored.revokedAt = new Date(); // each refresh token works once
    await this.refreshTokens.save(stored);

    return this.issueTokens(user);
  }

  // Blacklists the access token and cancels the user's refresh tokens
  async logout(userId: number, token: string) {
    await this.blacklist.save(this.blacklist.create({ token }));
    await this.revokeAll(userId);
    return { message: 'Logged out successfully' };
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const found = await this.blacklist.findOne({ where: { token } });
    return !!found;
  }

  // --- Role request endpoints (from main) ---

  async requestAdmin(userId: number, reason: string) {
    const existing = await this.roleRequests.findOne({
      where: { userId, type: RequestType.ADMIN, status: RequestStatus.PENDING },
    });
    if (existing) throw new ConflictException('You already have a pending admin request');

    const request = this.roleRequests.create({
      userId,
      type: RequestType.ADMIN,
      reason,
      status: RequestStatus.PENDING,
    });
    return this.roleRequests.save(request);
  }

  async requestDriver(userId: number, licenseId: string) {
    const request = this.roleRequests.create({
      userId,
      type: RequestType.DRIVER,
      licenseId,
      status: RequestStatus.PENDING,
    });
    return this.roleRequests.save(request);
  }

  async getPendingRequests(type?: RequestType) {
    const where = type
      ? { type, status: RequestStatus.PENDING }
      : { status: RequestStatus.PENDING };
    return this.roleRequests.find({ where, order: { createdAt: 'ASC' } });
  }

  async approveRequest(requestId: number) {
    const request = await this.roleRequests.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');

    if (request.type === RequestType.ADMIN) {
      await this.users.update(request.userId, { role: UserRole.ADMIN });
    } else if (request.type === RequestType.DRIVER) {
      await this.users.update(request.userId, {
        role: UserRole.DRIVER,
        licenseId: request.licenseId,
      });
    }

    request.status = RequestStatus.APPROVED;
    await this.roleRequests.save(request);
    return { message: 'Request approved successfully' };
  }

  // --- Token helpers (yours) ---

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAll(userId: number) {
    await this.refreshTokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // expiresIn is the access-token lifetime in seconds
    const decoded = this.jwt.decode(accessToken) as {
      exp?: number;
      iat?: number;
    } | null;
    const expiresIn = decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : 0;

    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(this.config.get('JWT_REFRESH_DAYS') ?? 7);
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}