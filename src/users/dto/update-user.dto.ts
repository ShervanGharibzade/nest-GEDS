import { PartialType } from '@nestjs/mapped-types';
import { RegisterUserDto } from '../../auth/dto/register-user.dto.js';
import { IsEmail, IsString, Min, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(RegisterUserDto) {
  @IsString()
  @MinLength(2)
  name?: string | undefined;

  @IsString()
  @MinLength(8)
  password?: string | undefined;
}
