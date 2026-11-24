
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { User, UserRole } from '../auth/entities/user.entity';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private async validateDriver(driverId?: number | null): Promise<void> {
    // A vehicle can be created without an assigned driver.
    // Null also allows an existing driver to be unassigned.
    if (driverId == null) return;

    const driver = await this.users.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver user not found');
    }

    if (driver.role !== UserRole.DRIVER) {
      throw new BadRequestException(
        'Only users with the driver role can be assigned to vehicles',
      );
    }

    if (!driver.isActive) {
      throw new BadRequestException(
        'An inactive user cannot be assigned as a driver',
      );
    }
  }

  async create(dto: CreateVehicleDto) {
    await this.validateDriver(dto.driverId);
    return this.vehicles.save(this.vehicles.create(dto));
  }

  async findAll() {
    return this.vehicles.find();
  }

  async findOne(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async findByRoute(routeId: number) {
    const schedules = await this.schedules.find({
      where: { routeId, isActive: true },
      relations: { vehicle: { driver: true } },
    });

    if (!schedules.length) return [];

    const results = [];

    for (const schedule of schedules) {
      const fare = await this.fares.findOne({ where: { routeId } });
      const bookedCount = await this.bookings.count({
        where: {
          scheduleId: schedule.id,
          status: BookingStatus.CONFIRMED,
        },
      });

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
        availableSeats: schedule.vehicle.capacity - bookedCount,
      });
    }

    return results;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    await this.findOne(id);

    if (dto.driverId !== undefined) {
      await this.validateDriver(dto.driverId);
    }

    await this.vehicles.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const vehicle = await this.findOne(id);
    await this.vehicles.remove(vehicle);
    return { deleted: true, id };
  }
}
