import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { SecurityModule } from '../../security/security.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [HttpModule, SecurityModule],
  controllers: [MetaController],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}
