import { Module } from '@nestjs/common';

import { InstagramModule } from '../instagram/instagram.module';
import { MetaModule } from '../integrations/meta/meta.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [MetaModule, InstagramModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
