import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { PassengerProfile } from './entities/passenger-profile.entity';
import { UpdatePassengerProfileDto } from './dto/update-passenger-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(PassengerProfile)
    private profiles: Repository<PassengerProfile>,
  ) {}

  // Add the role parameter here
  async findAll(role?: UserRole) {
    const where = role ? { role } : {};

    return this.usersRepository.find({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private profileView(p: PassengerProfile) {
    return {
      name: p.name,
      email: p.email,
      phone: p.phone,
      identificationNumber: p.identificationNumber,
      updatedAt: p.updatedAt,
    };
  }

  // The saved profile, or one pre-filled from the account if none is saved yet
  async getProfile(userId: number) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (profile) return this.profileView(profile);

    const user = await this.findOne(userId);
    return {
      name: user.fullName,
      email: user.email,
      phone: user.phoneNumber ?? null,
      identificationNumber: null,
      updatedAt: null,
    };
  }

  async saveProfile(userId: number, dto: UpdatePassengerProfileDto) {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) profile = this.profiles.create({ userId });

    profile.name = dto.name;
    profile.email = dto.email;
    profile.phone = dto.phone ?? null;
    profile.identificationNumber = dto.identificationNumber ?? null;

    return this.profileView(await this.profiles.save(profile));
  }
}