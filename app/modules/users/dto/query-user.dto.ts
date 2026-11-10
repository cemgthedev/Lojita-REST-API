import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryUserDto extends PaginationDto {
  @IsString()
  @IsOptional()
  name!: string;

  @IsEnum(Role)
  @IsOptional()
  role!: Role;
}
