import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TransportService } from './transport.service';
import { TransportType } from './entities/vehicle.entity';

const validDto = {
  name: 'Minibus',
  plateNumber: 'bl 1234',
  seatingCapacity: 14,
  driverName: 'John Banda',
  driverPhone: '+265991234567',
};

describe('TransportService', () => {
  let service: TransportService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportService,
        { provide: getRepositoryToken(TransportType), useValue: repo },
      ],
    }).compile();

    service = module.get(TransportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('saves with an upper-cased plate number', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create(validDto);
      expect(result.plateNumber).toBe('BL 1234');
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws 409 when the plate already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 2 });
      await expect(service.create(validDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a database unique violation to 409', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue({ code: '23505' });
      await expect(service.create(validDto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws 404 when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repo.findOne.mockImplementation(async ({ where }) => {
        if (where.id === 1) return { id: 1 };
        if (where.plateNumber === 'BL 9999') return { id: 2 }; // taken by another
        return null;
      });
    });

    it('throws 400 when no fields are given', async () => {
      await expect(service.update(1, {})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 409 when the plate belongs to another transport', async () => {
      await expect(
        service.update(1, { plateNumber: 'bl 9999' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates seating capacity', async () => {
      await service.update(1, { seatingCapacity: 18 });
      expect(repo.update).toHaveBeenCalledWith(1, { seatingCapacity: 18 });
    });
  });

  describe('remove', () => {
    it('returns { deleted, id } on success', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.remove(1)).resolves.toEqual({ deleted: true, id: 1 });
    });

    it('throws 409 when a foreign key blocks the delete', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      repo.remove.mockRejectedValue({ code: '23503' });
      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
