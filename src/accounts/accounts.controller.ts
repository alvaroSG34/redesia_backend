import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOauthUrlDto } from './dto/create-oauth-url.dto';
import { AccountsService } from './accounts.service';

@Controller('v1/clients/:clientId/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  getAccounts(@Param('clientId') clientId: string) {
    return this.accountsService.getAccounts(clientId);
  }

  @Get('summary-v2')
  getAccountsSummaryV2(@Param('clientId') clientId: string) {
    return this.accountsService.getAccountsSummaryV2(clientId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('instagram/oauth-url')
  createOauthUrl(
    @Param('clientId') clientId: string,
    @Body() dto: CreateOauthUrlDto,
  ) {
    return this.accountsService.createInstagramOauthUrl(clientId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':accountId/sync')
  syncAccount(
    @Param('clientId') clientId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.syncAccount(clientId, accountId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':accountId/disconnect')
  disconnectAccount(
    @Param('clientId') clientId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.disconnectAccount(clientId, accountId);
  }
}

