import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private blacklist: TokenBlacklistService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  validate(req: any, payload: { sub: string; email: string; role: string }) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token && this.blacklist.has(token)) {
      throw new UnauthorizedException('Token has been logged out');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}