import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from './role.enum';

export interface User {
  id: number;
  email: string;
  fullName: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
}

@Injectable()
export class UsersService implements OnModuleInit {
  // TEMPORARY: swap this array for database queries later.
  private users: User[] = [];
  private nextId = 1;

  // Seeds one admin so you can test protected endpoints.
  async onModuleInit() {
    await this.create({
      email: 'admin@yendaroute.mw',
      fullName: 'System Admin',
      passwordHash: await bcrypt.hash('Admin@12345', 10),
      role: Role.ADMIN,
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email.toLowerCase());
  }

  async findById(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async create(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: Role;
  }): Promise<User> {
    const user: User = {
      id: this.nextId++,
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: true,
    };
    this.users.push(user);
    return user;
  }
}