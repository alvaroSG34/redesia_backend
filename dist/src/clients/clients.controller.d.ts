import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsQueryDto } from './dto/clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    getClients(query: ClientsQueryDto): Promise<import("../common/contracts").PaginatedResult<import("../common/contracts").ClientContract>>;
    createClient(dto: CreateClientDto): Promise<import("../common/contracts").ClientContract>;
    getClient(clientId: string): Promise<import("../common/contracts").ClientContract>;
    updateClient(clientId: string, dto: UpdateClientDto): Promise<import("../common/contracts").ClientContract>;
    getSummary(clientId: string): Promise<import("../common/contracts").ClientDashboardSummary>;
    getSummaryV2(clientId: string): Promise<import("../common/contracts").ClientSummaryV2Response>;
    deleteClient(clientId: string): Promise<{
        ok: boolean;
        clientId: string;
    }>;
}
