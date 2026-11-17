import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return { 
      status: 'online', 
      message: 'YendaRoute Backend API is running successfully',
      version: '1.2.0'
    };
  }
}