import type { AuthUserPayload } from './auth-user-payload';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: import("./auth.service").PublicUser;
    }>;
    me(request: {
        user: AuthUserPayload;
    }): Promise<import("./auth.service").PublicUser>;
}
