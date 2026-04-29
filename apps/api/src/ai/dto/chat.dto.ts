import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'What can I cook with rice and eggs?' })
  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class AiChatDto {
  @ApiProperty({ example: 'What can I meal prep for the week?' })
  @IsString()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ type: () => [AiChatMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  history?: AiChatMessageDto[];

  @ApiPropertyOptional({
    example: {
      page: '/recipes',
      selectedRecipeName: 'Arroz con pollo',
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

