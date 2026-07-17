import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { getDeploymentEnvironment } from './deployment-environment';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check root endpoint' })
  @ApiOkResponse({ description: 'Simple root response', type: String })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe for API process' })
  @ApiOkResponse({ description: 'API process is alive' })
  getHealth() {
    return {
      ...this.appService.getHealth(),
      environment: getDeploymentEnvironment(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary:
      'Readiness probe for API traffic (database + provider configuration state)',
  })
  @ApiOkResponse({ description: 'API is ready to serve traffic' })
  async getReady() {
    const readiness = await this.appService.getReadiness();
    const identifiedReadiness = {
      ...readiness,
      environment: getDeploymentEnvironment(),
    };

    if (readiness.status !== 'ready') {
      throw new ServiceUnavailableException(identifiedReadiness);
    }

    return identifiedReadiness;
  }
}
