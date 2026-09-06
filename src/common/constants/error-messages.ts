import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export const ERROR_MESSAGES = {
  USER: {
    EMAIL_ALREADY_EXISTS: (): ConflictException =>
      new ConflictException('Email already exists'),

    NOT_FOUND: (): NotFoundException => new NotFoundException('User not found'),

    INVALID_CREDENTIALS: (): UnauthorizedException =>
      new UnauthorizedException('Invalid email or password'),
  },

  AUTH: {
    UNAUTHORIZED: (): UnauthorizedException =>
      new UnauthorizedException('Unauthorized'),

    INVALID_TOKEN: (): UnauthorizedException =>
      new UnauthorizedException('Invalid or expired token'),
  },
} as const;
