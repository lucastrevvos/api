import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly rounds = 10;

  hash(value: string) {
    return bcrypt.hash(value, this.rounds);
  }

  compare(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }
}
