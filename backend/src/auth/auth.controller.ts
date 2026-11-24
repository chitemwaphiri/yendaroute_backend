import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class AuthTokensResponse {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOi...' })
  refreshToken: string;
}

class AuthUserResponse {
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

class LoginResponse {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOi...' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponse })
  user: AuthUserResponse;
}

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new passenger account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AuthUserResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or email already registered',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Authenticate and receive access and refresh tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: LoginResponse,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'New tokens issued',
    type: AuthTokensResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the current access token (logout)' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@Req() req: any) {
    const token = req.headers.authorization.split(' ')[1];
    return this.auth.logout(req.user.userId, token);
  }
}
