import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Used by Docker/orchestrators as a liveness/readiness probe. */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiExcludeEndpoint()
  getHealth() {
    return this.appService.getHealth();
  }
}
