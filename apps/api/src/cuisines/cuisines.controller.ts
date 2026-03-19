import { Controller, Get } from '@nestjs/common';
import type { Cuisine } from '@cart/shared';
import { ApiListCuisines, ApiCuisinesController } from './cuisines.swagger';
import { CuisinesService } from './cuisines.service';

@ApiCuisinesController()
@Controller('api/v1/cuisines')
export class CuisinesController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  @Get()
  @ApiListCuisines()
  findAll(): Promise<Cuisine[]> {
    return this.cuisinesService.findAll();
  }
}
