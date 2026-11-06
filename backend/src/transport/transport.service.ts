import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportType } from './entities/transport-type.entity';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

// Postgres error codes
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(TransportType)
    private types: Repository<TransportType>,
  ) {}

  async create(dto: CreateTransportTypeDto) {
    const data = this.normalize(dto);
    await this.assertPlateFree(data.plateNumber);
    try {
      return await this.types.save(this.types.create(data));
    } catch (e) {
      this.rethrowDbError(e);
    }
  }

  findAll() {
    return this.types.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const t = await this.types.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Transport type ${id} not found`);
    return t;
  }

  async update(id: number, dto: UpdateTransportTypeDto) {
    await this.findOne(id);
    const data = this.normalize(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }
    if (data.plateNumber) await this.assertPlateFree(data.plateNumber, id);

    try {
      await this.types.update(id, data);
    } catch (e) {
      this.rethrowDbError(e);
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    const t = await this.findOne(id);
    try {
      await this.types.remove(t);
    } catch (e) {
      if (this.dbCode(e) === FK_VIOLATION) {
        throw new ConflictException(
          'Transport is in use by a route or schedule and cannot be deleted',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }

  // ---------- helpers ----------

  /** Trim and upper-case plates so "bl 1234" and "BL 1234" are the same. */
  private normalize<T extends { plateNumber?: string }>(dto: T): T {
    return dto.plateNumber
      ? { ...dto, plateNumber: dto.plateNumber.trim().toUpperCase() }
      : dto;
  }

  private async assertPlateFree(plateNumber: string, exceptId?: number) {
    const existing = await this.types.findOne({ where: { plateNumber } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        `Plate number ${plateNumber} is already registered`,
      );
    }
  }

  private dbCode(e: any): string | undefined {
    return e?.code ?? e?.driverError?.code;
  }

  /** Catches the race where two requests pass the check at the same time. */
  private rethrowDbError(e: any): never {
    if (this.dbCode(e) === UNIQUE_VIOLATION) {
      throw new ConflictException('Plate number is already registered');
    }
    throw e;
  }
}