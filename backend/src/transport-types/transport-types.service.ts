
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportType } from './entities/transport-type.entity';

@Injectable()
export class TransportTypesService {
  constructor(
    @InjectRepository(TransportType)
    private readonly transportTypesRepository: Repository<TransportType>,
  ) {}

  async findAll(): Promise<TransportType[]> {
    return this.transportTypesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<TransportType> {
    const transportType = await this.transportTypesRepository.findOneBy({
      id,
    });

    if (!transportType) {
      throw new NotFoundException(
        `Transport type with ID ${id} was not found`,
      );
    }

    return transportType;
  }

  async create(data: {
    name: string;
    description?: string | null;
  }): Promise<TransportType> {
    const transportType = this.transportTypesRepository.create(data);

    return this.transportTypesRepository.save(transportType);
  }

  async update(
    id: number,
    data: Partial<Pick<TransportType, 'name' | 'description'>>,
  ): Promise<TransportType> {
    const transportType = await this.findOne(id);

    Object.assign(transportType, data);

    return this.transportTypesRepository.save(transportType);
  }

  async deactivate(id: number): Promise<TransportType> {
    const transportType = await this.findOne(id);

    transportType.isActive = false;

    return this.transportTypesRepository.save(transportType);
  }
}

