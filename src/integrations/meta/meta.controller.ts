import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { MetaService } from './meta.service';

@Controller('v1/integrations/meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('callback')
  async handleCallback(
    @Query('state') state: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

    try {
      const result = await this.metaService.handleCallback(state, code);
      const redirectUrl = new URL(
        `/clients/${result.clientId}/accounts`,
        frontendOrigin,
      );
      redirectUrl.searchParams.set('connected', 'true');
      redirectUrl.searchParams.set('accountId', result.accountId);
      return res.redirect(302, redirectUrl.toString());
    } catch (error) {
      const redirectUrl = new URL('/clients', frontendOrigin);
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo completar la conexion con Meta';
      redirectUrl.searchParams.set('oauthError', message);
      return res.redirect(302, redirectUrl.toString());
    }
  }
}
