import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MeController } from './me.controller';
import { User } from '../auth/entities/user.entity';
import { PassengerProfile } from './entities/passenger-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PassengerProfile])],
  controllers: [UsersController, MeController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
