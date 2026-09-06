import { OmitType } from '@nestjs/mapped-types';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { RegisterUserDto } from './register-user.dto.js';

export class LoginUserDto extends OmitType(RegisterUserDto, ['name'] as const) {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
