import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RetailerCapabilityResponseDto } from '../common/http/swagger.dto';
import { RetailersService } from './retailers.service';

@ApiTags('retailers')
@Controller('api/v1/retailers')
export class RetailersController {
  constructor(private readonly retailersService: RetailersService) {}

  @Get('capabilities')
  @ApiOperation({
    summary: 'List retailer integration capabilities and demo readiness',
  })
  @ApiOkResponse({
    description: 'Retailer capabilities available to clients.',
    type: RetailerCapabilityResponseDto,
    isArray: true,
  })
  listCapabilities() {
    return this.retailersService.listCapabilities();
  }
}
