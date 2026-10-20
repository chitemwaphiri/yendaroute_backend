import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private revoked = new Set<string>();

  add(token: string) {
    this.revoked.add(token);
  }

  has(token: string): boolean {
    return this.revoked.has(token);
  }
}