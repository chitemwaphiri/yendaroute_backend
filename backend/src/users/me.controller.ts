import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdatePassengerProfileDto } from './dto/update-passenger-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthedRequest {
  user: { userId: number };
}

@ApiTags('Me')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Who is logged in' })
  me(@Req() req: AuthedRequest) {
    return this.users.findOne(Number(req.user.userId));
  }

  @Get('passenger-profile')
  @ApiOperation({ summary: 'Load my saved passenger details' })
  getProfile(@Req() req: AuthedRequest) {
    return this.users.getProfile(Number(req.user.userId));
  }

  @Put('passenger-profile')
  @ApiOperation({ summary: 'Save my passenger details' })
  saveProfile(
    @Req() req: AuthedRequest,
    @Body() dto: UpdatePassengerProfileDto,
  ) {
    return this.users.saveProfile(Number(req.user.userId), dto);
  }
}