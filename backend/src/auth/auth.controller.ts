import { Body, Controller, Get, Post, Req, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    return this.auth.logout(req.headers.authorization.split(' ')[1]);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) { return this.auth.me(req.user.userId); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-admin')
  requestAdmin(@Req() req: any, @Body() dto: RequestAdminDto) {
    return this.auth.requestAdmin(req.user.userId, dto.reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-driver')
  requestDriver(@Req() req: any, @Body() dto: RequestDriverDto) {
    return this.auth.requestDriver(req.user.userId, dto.licenseId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('requests')
  getPendingRequests(@Query('type') type?: RequestType) {
    return this.auth.getPendingRequests(type);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('requests/:id/approve')
  approveRequest(@Param('id', ParseIntPipe) id: number) {
    return this.auth.approveRequest(id); // <-- Fixed to 1 argument
  }
}