import { type ClientSummaryV2Response, type ClientDashboardSummary, type PaginatedResult } from '../common/contracts';
import { mapClient } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsQueryDto } from './dto/clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';
export declare class ClientsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getClients(query: ClientsQueryDto): Promise<PaginatedResult<ReturnType<typeof mapClient>>>;
    getClient(clientId: string): Promise<import("../common/contracts").ClientContract>;
    createClient(dto: CreateClientDto): Promise<import("../common/contracts").ClientContract>;
    updateClient(clientId: string, dto: UpdateClientDto): Promise<import("../common/contracts").ClientContract>;
    deleteClient(clientId: string): Promise<{
        ok: boolean;
        clientId: string;
    }>;
    getClientSummary(clientId: string): Promise<ClientDashboardSummary>;
    getClientSummaryV2(clientId: string): Promise<ClientSummaryV2Response>;
    private resolveClientId;
    private fromLabelToStatus;
    private ensureClientExists;
}
