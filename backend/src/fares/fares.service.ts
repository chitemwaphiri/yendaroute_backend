import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fare } from './entities/fare.entity';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

@Injectable()
export class FaresService {
  constructor(@InjectRepository(Fare) private fares: Repository<Fare>) {}

  async create(dto: CreateFareDto) {
    const fare = this.fares.create({
      ...dto,
      currency: dto.currency ?? 'MWK',
    });
    return this.fares.save(fare);
  }

  async findByStops(originStopId: number, destinationStopId: number) {
    const fare = await this.fares.findOne({
      where: { originStopId, destinationStopId },
    });
    if (!fare) throw new NotFoundException('Fare not found for these stops');
    return fare;
  }

  async findByRoute(routeId: number) {
    return this.fares.find({ where: { routeId } });
  }

  async estimate(originStopId: number, destinationStopId: number, routeId?: number) {
    const where: any = { originStopId, destinationStopId };
    if (routeId) where.routeId = routeId;

    const fare = await this.fares.findOne({ where });
    if (!fare) throw new NotFoundException('Estimated fare not found');
    return { estimatedAmount: fare.amount, currency: fare.currency };
  }

  async update(id: number, dto: UpdateFareDto) {
    const fare = await this.fares.findOne({ where: { id } });
    if (!fare) throw new NotFoundException('Fare not found');
    await this.fares.update(id, dto);
    return this.fares.findOne({ where: { id } });
  }

  async remove(id: number) {
    const fare = await this.fares.findOne({ where: { id } });
    if (!fare) throw new NotFoundException('Fare not found');
    await this.fares.remove(fare);
    return { deleted: true, id };
  }
}