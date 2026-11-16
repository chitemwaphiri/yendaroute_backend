import {
  Body, Controller, Get, Post, Req, UseGuards, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { RequestType } from './entities/role-request.entity';
import { IsString } from 'class-validator';

class RequestAdminDto {
  @ApiProperty({ example: 'I manage the Lilongwe terminal' })
  @IsString() reason: string;
}

class RequestDriverDto {
  @ApiProperty({ example: 'DL-123456' })
  @IsString() licenseId: string;
}

@ApiTags('Auth & Roles')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Sign up (name, email, password; phone optional)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in and receive access and refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Swap a refresh token for fresh tokens' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Log out: cancels the access and refresh tokens' })
  logout(@Req() req: any) {
    const token = req.headers.authorization.split(' ')[1];
    return this.auth.logout(Number(req.user.userId), token);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-admin')
  requestAdmin(@Req() req: any, @Body() dto: RequestAdminDto) {
    return this.auth.requestAdmin(Number(req.user.userId), dto.reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-driver')
  requestDriver(@Req() req: any, @Body() dto: RequestDriverDto) {
    return this.auth.requestDriver(Number(req.user.userId), dto.licenseId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('requests')
  @ApiOperation({ summary: 'Admin: list pending admin/driver requests' })
  getPendingRequests(@Query('type') type?: RequestType) {
    return this.auth.getPendingRequests(type);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Admin: approve an admin/driver request' })
  approveRequest(@Param('id', ParseIntPipe) id: number) {
    return this.auth.approveRequest(id);
  }
}