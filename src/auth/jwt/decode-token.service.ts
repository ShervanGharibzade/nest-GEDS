import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../prisma/generated/enums.js';

interface AccessTokenPayload {
  sub: number;
  email: string;
  role: UserRole;
}

interface RefreshTokenPayload {
  sub: number;
}

interface DecodedAccessToken {
  id: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class DecodeTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async decodeAccessToken(token: string): Promise<DecodedAccessToken> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async decodeRefreshToken(token: string): Promise<{ id: number }> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
