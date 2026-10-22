import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Stop } from '../stops/entities/stop.entity';
import { Route } from '../routes/entities/route.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Stop)
    private readonly stopRepository: Repository<Stop>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async searchTrips(from: string, to: string, date?: string) {
    const originStop = await this.stopRepository.findOne({ where: { name: Like(`%${from}%`) } });
    const destinationStop = await this.stopRepository.findOne({ where: { name: Like(`%${to}%`) } });

    if (!originStop || !destinationStop) {
      return { message: "Could not find one or both stops. Please check the names." };
    }

    const routes = await this.routeRepository.find({
      where: { 
        originStopId: originStop.id, 
        destinationStopId: destinationStop.id,
        isActive: true 
      },
      relations: { transportType: true }
    });

    if (routes.length === 0) {
      return { message: "No routes found between these two locations." };
    }

    const routeIds = routes.map(r => r.id);
    
    const schedules = await this.scheduleRepository.find({
      where: routeIds.map(id => ({ routeId: id, isActive: true })),
      relations: { route: true },
      order: { departureTime: 'ASC' }
    });

    const results = [];
    for (const schedule of schedules) {
      const bookings = await this.bookingRepository.find({
        where: { scheduleId: schedule.id, status: BookingStatus.CONFIRMED }
      });
      
      const bookedSeats = bookings.reduce((total, b) => total + b.seats, 0);
      const totalCapacity = 14; 
      const availableSeats = totalCapacity - bookedSeats;

      const route = routes.find(r => r.id === schedule.routeId);

      if (route) {
        results.push({
          routeName: route!.name,               // Added !
          description: route!.description,      // Added !
          transportType: route!.transportType?.name, // Added !
          departureTime: schedule.departureTime,
          arrivalTime: schedule.arrivalTime,
          price: schedule.price,
          availableSeats: availableSeats > 0 ? availableSeats : 0,
        });
      }
    }

    return results;
  }
}