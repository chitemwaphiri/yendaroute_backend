import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from './role.enum';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user (admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safe } = user;
    return safe;
  }
}