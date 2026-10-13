
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoutesModule } from './routes/routes.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [RoutesModule, SearchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}