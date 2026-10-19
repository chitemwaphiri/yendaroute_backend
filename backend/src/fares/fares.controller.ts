
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

@Controller('fares')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FaresController {
  constructor(private readonly faresService: FaresService) {}

  @Get()
  findByStops(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.faresService.findByStops(
      originStopId,
      destinationStopId,
    );
  }

  @Get('estimate')
  estimate(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.faresService.estimate(
      originStopId,
      destinationStopId,
    );
  }

  @Get('route/:routeId')
  findByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.faresService.findByRoute(routeId);
  }

  @Post()
  create(@Body() data: CreateFareDto) {
    return this.faresService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateFareDto,
  ) {
    return this.faresService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.faresService.remove(id);
    return { message: 'Fare deleted successfully' };
  }
}
