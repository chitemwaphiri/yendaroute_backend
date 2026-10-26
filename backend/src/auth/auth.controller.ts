import { 
  Body, Controller, Get, Post, Req, UseGuards, Param, ParseIntPipe 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestAdminDto } from './dto/request-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    // Extract the token from the header and blacklist it
    const token = req.headers.authorization.split(' ')[1];
    return this.auth.logout(token);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-admin')
  requestAdmin(@Req() req: any, @Body() dto: RequestAdminDto) {
    return this.auth.requestAdmin(req.user.userId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin-requests')
  getPendingRequests() {
    return this.auth.getPendingRequests();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin-requests/:id/approve')
  approveRequest(@Param('id', ParseIntPipe) id: number) {
    return this.auth.approveAdminRequest(id);
  }

  
}