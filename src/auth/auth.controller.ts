import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthUserPayload } from './auth-user-payload';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @Req()
    request: {
      user: AuthUserPayload;
    },
  ) {
    return this.authService.me(request.user);
  }
}

