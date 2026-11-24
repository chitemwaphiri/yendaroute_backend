import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Operator } from './entities/operator.entity';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Operator) private operators: Repository<Operator>,
  ) {}

  async create(dto: CreateVehicleDto) {
    const normalized = this.vehicles.create({
      name: dto.name,
      plateNumber: dto.registrationNumber,
      vehicleType: dto.type,
      capacity: dto.seatCapacity,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.vehicles.save(normalized);
    return this.formatVehicle(Array.isArray(saved) ? saved[0] : saved);
  }

  async findAll() {
    const vehicles = await this.vehicles.find();
    return vehicles.map((vehicle) => this.formatVehicle(vehicle));
  }

  async findOne(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.formatVehicle(vehicle);
  }

  async findByRoute(routeId: number) {
    const schedules = await this.schedules.find({
      where: { routeId, isActive: true },
      relations: { vehicle: { driver: true } }
    });
    if (!schedules.length) return [];

    const results = [];
    for (const schedule of schedules) {
      const vehicle = schedule.vehicle;
      if (!vehicle) continue;
      const fare = await this.fares.findOne({ where: { routeId } });
      const bookedCount = await this.bookings.count({ where: { scheduleId: schedule.id, status: BookingStatus.CONFIRMED } });
      
      results.push({
        vehicleDetails: {
          plateNumber: vehicle.plateNumber,
          vehicleType: vehicle.vehicleType,
          capacity: vehicle.capacity,
          description: vehicle.description,
        },
        driverDetails: {
          name: vehicle.driver?.fullName || 'Not assigned',
          phoneNumber: vehicle.driver?.phoneNumber || 'Not assigned',
        },
        scheduleDetails: {
          departureTime: schedule.departureTime,
          daysOfWeek: schedule.daysOfWeek,
        },
        fare: fare ? { amount: fare.amount, currency: fare.currency } : null,
        availableSeats: vehicle.capacity - bookedCount
      });
    }
    return results;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    await this.findOne(id);
    await this.vehicles.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.registrationNumber !== undefined ? { plateNumber: dto.registrationNumber } : {}),
      ...(dto.type !== undefined ? { vehicleType: dto.type } : {}),
      ...(dto.seatCapacity !== undefined ? { capacity: dto.seatCapacity } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.vehicles.remove(vehicle);
    return undefined;
  }

  private formatVehicle(vehicle: Vehicle) {
    return {
      id: String(vehicle.id),
      name: vehicle.name ?? vehicle.plateNumber,
      registrationNumber: vehicle.plateNumber,
      type: vehicle.vehicleType,
      seatCapacity: vehicle.capacity,
      isActive: vehicle.isActive,
    };
  }

  async findOperators() {
    const rows = await this.operators.find();
    return rows.map((row) => ({ id: String(row.id), name: row.name, isActive: row.isActive }));
  }

  async createOperator(dto: { name: string; isActive?: boolean }) {
    const row = await this.operators.save(this.operators.create({ name: dto.name, isActive: dto.isActive ?? true }));
    return { id: String(row.id), name: row.name, isActive: row.isActive };
  }

  async updateOperator(id: number, dto: { name?: string; isActive?: boolean }) {
    await this.operators.update(id, dto);
    const row = await this.operators.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Operator not found');
    return { id: String(row.id), name: row.name, isActive: row.isActive };
  }
}