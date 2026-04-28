import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsQueryDto } from './dto/clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('v1/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  getClients(@Query() query: ClientsQueryDto) {
    return this.clientsService.getClients(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createClient(@Body() dto: CreateClientDto) {
    return this.clientsService.createClient(dto);
  }

  @Get(':clientId')
  getClient(@Param('clientId') clientId: string) {
    return this.clientsService.getClient(clientId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':clientId')
  updateClient(
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.updateClient(clientId, dto);
  }

  @Get(':clientId/summary')
  getSummary(@Param('clientId') clientId: string) {
    return this.clientsService.getClientSummary(clientId);
  }

  @Get(':clientId/summary-v2')
  getSummaryV2(@Param('clientId') clientId: string) {
    return this.clientsService.getClientSummaryV2(clientId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':clientId')
  deleteClient(@Param('clientId') clientId: string) {
    return this.clientsService.deleteClient(clientId);
  }
}
