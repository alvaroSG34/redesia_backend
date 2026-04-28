import { Injectable } from '@nestjs/common';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async getHealth() {
    const db = await this.prisma.$queryRaw`SELECT 1`;
    const aiHealth = await this.ai.health();
    const aiIsUp = aiHealth.status === 'up' || aiHealth.status === 'ok';

    return {
      status: aiIsUp ? 'ok' : 'degraded',
      db: Array.isArray(db) ? 'up' : 'up',
      ai: aiHealth,
      timestamp: new Date().toISOString(),
    };
  }
}
