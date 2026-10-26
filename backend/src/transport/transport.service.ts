import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportType } from './entities/transport-type.entity';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(TransportType)
    private types: Repository<TransportType>,
  ) {}

  async create(dto: CreateTransportTypeDto) {
    return this.types.save(this.types.create(dto));
  }

  findAll() {
    return this.types.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const t = await this.types.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transport type not found');
    return t;
  }

  async update(id: number, dto: UpdateTransportTypeDto) {
    await this.findOne(id);
    await this.types.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const t = await this.findOne(id);
    await this.types.remove(t);
    return { deleted: true, id };
  }
}