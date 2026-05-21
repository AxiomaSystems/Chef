import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchRetailerProductsQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  query!: string;
}
