import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role;
    if (role !== UserRole.ADMIN && role !== UserRole.DRIVER) {
      throw new ForbiddenException('Admins and drivers only');
    }
    return true;
  }
}