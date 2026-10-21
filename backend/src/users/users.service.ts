import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Role } from './role.enum';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserEntity> {
    const user = this.usersRepository.create({
      id: randomUUID(),
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: true,
    });

    return this.usersRepository.save(user);
  }
}
