import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, type UserRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import type { SignOptions } from 'jsonwebtoken';
import { sign } from 'jsonwebtoken';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUserPayload } from './auth-user-payload';
import { LoginDto } from './dto/login.dto';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; user: PublicUser }> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: AuthUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const secret = this.config.get<string>('APP_JWT_SECRET') ?? 'dev-jwt-change-me';
    const expiresIn = (this.config.get<string>('APP_JWT_EXPIRES_IN') ??
      '1d') as SignOptions['expiresIn'];

    const accessToken = sign(payload, secret, { expiresIn });

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  async me(user: AuthUserPayload): Promise<PublicUser> {
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('User not available');
    }

    return this.toPublicUser(account, true);
  }

  private toPublicUser(user: User, includeActive = false): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...(includeActive ? { isActive: user.isActive } : {}),
    };
  }
}

