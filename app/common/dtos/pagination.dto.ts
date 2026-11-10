import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PaginationDto {
  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than 0' })
  readonly limit: number = 10;

  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  readonly page: number = 1;
}
