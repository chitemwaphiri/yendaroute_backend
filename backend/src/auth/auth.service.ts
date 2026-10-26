import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { AdminRequest, RequestStatus } from './entities/admin-request.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity'; // <-- NEW
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestAdminDto } from './dto/request-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(AdminRequest) private adminRequests: Repository<AdminRequest>,
    @InjectRepository(TokenBlacklist) private blacklist: Repository<TokenBlacklist>, // <-- NEW
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
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
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user);
  }

  async me(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // --- NEW: LOGOUT & BLACKLIST METHODS ---
  async logout(token: string) {
    const blacklisted = this.blacklist.create({ token });
    await this.blacklist.save(blacklisted);
    return { message: 'Logged out successfully' };
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const found = await this.blacklist.findOne({ where: { token } });
    return !!found;
  }
  // ---------------------------------------

  async requestAdmin(userId: number, dto: RequestAdminDto) {
    const existing = await this.adminRequests.findOne({
      where: { userId, status: RequestStatus.PENDING },
    });

    if (existing) {
      throw new ConflictException('You already have a pending admin request');
    }

    const request = this.adminRequests.create({
      userId,
      reason: dto.reason,
      status: RequestStatus.PENDING,
    });

    return this.adminRequests.save(request);
  }

  async getPendingRequests() {
    return this.adminRequests.find({
      where: { status: RequestStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async approveAdminRequest(requestId: number) {
    const request = await this.adminRequests.findOne({
      where: { id: requestId, status: RequestStatus.PENDING },
    });

    if (!request) {
      throw new ConflictException('Request not found or already processed');
    }

    await this.users.update(request.userId, { role: UserRole.ADMIN });

    request.status = RequestStatus.APPROVED;
    await this.adminRequests.save(request);

    return { message: 'User promoted to Admin successfully', userId: request.userId };
  }

  private sign(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}