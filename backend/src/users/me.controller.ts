import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdatePassengerProfileDto } from './dto/update-passenger-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthedRequest {
  user: { userId: number };
}

class CurrentUserResponse {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Jane Passenger' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: 'passenger', enum: ['passenger', 'admin'] })
  role: 'passenger' | 'admin';

  @ApiProperty({ example: '2026-11-22T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-22T10:00:00Z' })
  updatedAt: string;
}

class PassengerProfileResponse {
  @ApiProperty({ example: 'Jane Passenger' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: '+265991234567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'P123456', nullable: true })
  identificationNumber: string | null;

  @ApiProperty({ example: '2026-11-22T10:00:00Z', nullable: true })
  updatedAt: Date | null;
}

@ApiTags('Me')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'The authenticated user',
    type: CurrentUserResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@Req() req: AuthedRequest) {
    return this.users.findOne(Number(req.user.userId));
  }

  @Get('passenger-profile')
  @ApiOperation({ summary: 'Load my saved passenger details' })
  @ApiResponse({
    status: 200,
    description: 'The passenger profile',
    type: PassengerProfileResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Req() req: AuthedRequest) {
    return this.users.getProfile(Number(req.user.userId));
  }

  @Patch('passenger-profile')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save my passenger details' })
  @ApiBody({ type: UpdatePassengerProfileDto })
  @ApiResponse({
    status: 200,
    description: 'The updated passenger profile',
    type: PassengerProfileResponse,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  saveProfile(
    @Req() req: AuthedRequest,
    @Body() dto: UpdatePassengerProfileDto,
  ) {
    return this.users.saveProfile(Number(req.user.userId), dto);
  }
}
