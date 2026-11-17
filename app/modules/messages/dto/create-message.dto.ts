import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  chatId!: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  senderId!: number;
}
