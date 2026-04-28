import { InstagramService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class SchedulerService {
    private readonly prisma;
    private readonly instagram;
    private readonly logger;
    constructor(prisma: PrismaService, instagram: InstagramService);
    syncConnectedAccounts(): Promise<void>;
}
