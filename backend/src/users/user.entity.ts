import { User, UserRole } from '../auth/entities/user.entity';

export { User as UserEntity };
export type Role = UserRole;
export enum RoleEnum {
  ADMIN = UserRole.ADMIN,
  PASSENGER = UserRole.PASSENGER,
  DRIVER = UserRole.DRIVER,
}