import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CartSelectionsDto } from './cart-selection.dto';

export class CreateCartDto extends CartSelectionsDto {
  @ApiPropertyOptional({ example: 'Weekly dinner plan' })
  @IsOptional()
  @IsString()
  name?: string;
}
