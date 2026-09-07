import { forwardRef, Module } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from './strategies/jwt.strategies.js';

import { AccessTokenService } from './jwt/access-token.service.js';
import { DecodeTokenService } from './jwt/decode-token.service.js';
import { RefreshTokenService } from './jwt/refresh-token.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule,

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,

    AccessTokenService,
    DecodeTokenService,
    RefreshTokenService,
  ],

  exports: [
    JwtModule,
    AccessTokenService,
    DecodeTokenService,
    RefreshTokenService,
  ],
})
export class AuthModule {}
