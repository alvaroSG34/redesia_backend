import type { UserRole } from '@prisma/client';
export interface AuthUserPayload {
    sub: string;
    email: string;
    role: UserRole;
}
