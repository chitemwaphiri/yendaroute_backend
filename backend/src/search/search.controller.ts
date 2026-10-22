import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    return this.searchService.searchTrips(from, to, date);
  }
}
