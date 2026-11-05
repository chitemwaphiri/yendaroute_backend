import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './role.enum';
import { UserEntity } from './user.entity';

export type User = UserEntity;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  // Seeds one admin (only if it does not exist yet) so you can test protected endpoints.
  async onModuleInit() {
    const email = 'admin@yendaroute.mw';
    const exists = await this.repo.findOne({ where: { email } });
    if (!exists) {
      await this.create({
        email,
        fullName: 'System Admin',
        passwordHash: await bcrypt.hash('Admin@12345', 10),
        role: Role.ADMIN,
      });
    }
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  // Every user without the password hash (used by the admin endpoint)
  async findAll() {
    const users = await this.repo.find({ order: { id: 'ASC' } });
    return users.map(({ passwordHash, ...safe }) => safe);
  }

  create(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: Role;
  }) {
    const user = this.repo.create({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: data.passwordHash,
      role: data.role,
    });
    return this.repo.save(user);
  }
}