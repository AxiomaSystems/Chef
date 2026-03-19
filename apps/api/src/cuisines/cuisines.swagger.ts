import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CuisineResponseDto } from '../common/http/swagger.dto';
import { cuisineListExample } from '../common/http/swagger.examples';

export const ApiCuisinesController = () => applyDecorators(ApiTags('cuisines'));

export const ApiListCuisines = () =>
  applyDecorators(
    ApiOperation({ summary: 'List available global cuisines' }),
    ApiOkResponse({
      description: 'Global cuisine catalog',
      type: CuisineResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            cuisines: {
              summary: 'Available cuisines',
              value: cuisineListExample,
            },
          },
        },
      },
    }),
  );
