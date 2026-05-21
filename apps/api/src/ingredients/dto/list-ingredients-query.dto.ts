import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListIngredientsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
