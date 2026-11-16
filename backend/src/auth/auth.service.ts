
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import {
  RoleRequest,
  RequestType,
  RequestStatus,
} from './entities/role-request.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(TokenBlacklist) private blacklist: Repository<TokenBlacklist>,
    @InjectRepository(RoleRequest) private roleRequests: Repository<RoleRequest>,
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
      phoneNumber: dto.phone ?? null,
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
    return this.users.findOne({ where: { id: userId } });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      const user = await this.users.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.sign(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async requestDriver(userId: number, licenseId: string) {
    const request = this.roleRequests.create({
      userId,
      type: RequestType.DRIVER,
      licenseId,
    });

    return this.roleRequests.save(request);
  }

  // Only pending DRIVER requests are returned for approval.
  async getPendingRequests(type?: RequestType) {
    return this.roleRequests.find({
      where: {
        type: RequestType.DRIVER,
        status: RequestStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async approveRequest(requestId: number) {
    const request = await this.roleRequests.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Admin roles must never be assigned through role requests.
    if (request.type === RequestType.ADMIN) {
      request.status = RequestStatus.REJECTED;
      await this.roleRequests.save(request);

      throw new UnauthorizedException(
        'Admin roles cannot be assigned through role requests.',
      );
    }

    if (request.type === RequestType.DRIVER) {
      await this.users.update(request.userId, {
        role: UserRole.DRIVER,
        licenseId: request.licenseId,
      });
    }

    request.status = RequestStatus.APPROVED;
    await this.roleRequests.save(request);

    return { message: 'Driver request approved successfully' };
  }

  async logout(userId: number, token: string) {
    await this.blacklist.save(this.blacklist.create({ token }));

    return { message: 'Logged out successfully' };
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return !!(await this.blacklist.findOne({ where: { token } }));
  }

  private sign(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

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
