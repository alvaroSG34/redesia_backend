import { ConfigService } from '@nestjs/config';
import { type UserRole } from '@prisma/client';
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
export declare class AuthService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: PublicUser;
    }>;
    me(user: AuthUserPayload): Promise<PublicUser>;
    private toPublicUser;
}
