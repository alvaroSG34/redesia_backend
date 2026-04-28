import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';

import type { AuthUserPayload } from './auth-user-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: AuthUserPayload;
    }>();

    const authHeader = this.getHeaderValue(
      request.headers?.authorization,
    )?.trim();

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secret = this.config.get<string>('APP_JWT_SECRET') ?? 'dev-jwt-change-me';

    try {
      const payload = verify(token, secret);
      if (!this.isAuthPayload(payload)) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private isAuthPayload(payload: unknown): payload is AuthUserPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return (
      typeof candidate.sub === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.role === 'string'
    );
  }
}

