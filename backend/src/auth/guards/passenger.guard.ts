import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class PassengerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== UserRole.PASSENGER) {
      throw new ForbiddenException('Passenger access required');
    }
    return true;
  }
}
