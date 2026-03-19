import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

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
}
