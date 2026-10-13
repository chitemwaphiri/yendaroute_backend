import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from '../users/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private blacklist: TokenBlacklistService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email is already registered');
    }
    const user = await this.users.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: Role.PASSENGER, // self-registration is never admin
    });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const valid = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  logout(token: string) {
    this.blacklist.add(token);
    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private issueToken(user: {
    id: string;
    email: string;
    role: Role;
    fullName: string;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}