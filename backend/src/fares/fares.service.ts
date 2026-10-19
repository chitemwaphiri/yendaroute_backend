
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fare } from './entities/fare.entity';

@Injectable()
export class FaresService {
  constructor(
    @InjectRepository(Fare)
    private readonly faresRepository: Repository<Fare>,
  ) {}

  async findByStops(
    originStopId: number,
    destinationStopId: number,
  ): Promise<Fare[]> {
    return this.faresRepository.find({
      where: {
        originStopId,
        destinationStopId,
      },
      order: { id: 'ASC' },
    });
  }

  async findByRoute(routeId: number): Promise<Fare[]> {
    return this.faresRepository.find({
      where: { routeId },
      order: { id: 'ASC' },
    });
  }

  async estimate(
    originStopId: number,
    destinationStopId: number,
  ): Promise<Fare[]> {
    return this.findByStops(originStopId, destinationStopId);
  }

  async create(data: {
    routeId: number;
    originStopId: number;
    destinationStopId: number;
    amount: string;
    currency?: string;
  }): Promise<Fare> {
    const fare = this.faresRepository.create(data);

    return this.faresRepository.save(fare);
  }

  async update(
    id: number,
    data: Partial<
      Pick<
        Fare,
        | 'routeId'
        | 'originStopId'
        | 'destinationStopId'
        | 'amount'
        | 'currency'
      >
    >,
  ): Promise<Fare> {
    const fare = await this.faresRepository.findOneBy({ id });

    if (!fare) {
      throw new NotFoundException(`Fare with ID ${id} was not found`);
    }

    Object.assign(fare, data);

    return this.faresRepository.save(fare);
  }

  async remove(id: number): Promise<void> {
    const result = await this.faresRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Fare with ID ${id} was not found`);
    }
  }
}
