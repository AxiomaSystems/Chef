import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PartialCartSelectionsDto } from './cart-selection.dto';

export class UpdateCartDto extends PartialCartSelectionsDto {
  @ApiPropertyOptional({ example: 'Updated weekly dinner plan' })
  @IsOptional()
  @IsString()
  name?: string;
}
