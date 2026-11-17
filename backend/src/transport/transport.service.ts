import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
  ) {}

  async create(dto: CreateVehicleDto) {
    return this.vehicles.save(this.vehicles.create(dto));
  }

  async findAll() { return this.vehicles.find(); }

  async findOne(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async findByRoute(routeId: number) {
    const schedules = await this.schedules.find({
      where: { routeId, isActive: true },
      relations: { vehicle: { driver: true } }
    });
    if (!schedules.length) return [];

    const results = [];
    for (const schedule of schedules) {
      const fare = await this.fares.findOne({ where: { routeId } });
      const bookedCount = await this.bookings.count({ where: { scheduleId: schedule.id, status: BookingStatus.CONFIRMED } });
      
      results.push({
        vehicleDetails: {
          plateNumber: schedule.vehicle.plateNumber,
          vehicleType: schedule.vehicle.vehicleType,
          capacity: schedule.vehicle.capacity,
          description: schedule.vehicle.description,
        },
        driverDetails: {
          name: schedule.vehicle.driver?.fullName || 'Not assigned',
          phoneNumber: schedule.vehicle.driver?.phoneNumber || 'Not assigned',
        },
        scheduleDetails: {
          departureTime: schedule.departureTime,
          daysOfWeek: schedule.daysOfWeek,
        },
        fare: fare ? { amount: fare.amount, currency: fare.currency } : null,
        availableSeats: schedule.vehicle.capacity - bookedCount
      });
    }
    return results;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    await this.findOne(id);
    await this.vehicles.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const vehicle = await this.findOne(id);
    await this.vehicles.remove(vehicle);
    return { deleted: true, id };
  }
}