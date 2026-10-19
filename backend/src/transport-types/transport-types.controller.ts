
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransportTypesService } from './transport-types.service';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

@Controller('transport')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class TransportTypesController {
  constructor(
    private readonly transportTypesService: TransportTypesService,
  ) {}

  @Get()
  findAll() {
    return this.transportTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transportTypesService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateTransportTypeDto) {
    return this.transportTypesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTransportTypeDto,
  ) {
    return this.transportTypesService.update(id, data);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.transportTypesService.deactivate(id);
  }
}
