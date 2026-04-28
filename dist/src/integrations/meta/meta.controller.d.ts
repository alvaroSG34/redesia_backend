import type { Response } from 'express';
import { MetaService } from './meta.service';
export declare class MetaController {
    private readonly metaService;
    constructor(metaService: MetaService);
    handleCallback(state: string, code: string, res: Response): Promise<void>;
}
