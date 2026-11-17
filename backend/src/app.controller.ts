import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiExcludeEndpoint() // <--- THIS HIDES IT FROM SWAGGER
  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
