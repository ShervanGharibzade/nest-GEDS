import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface RefreshTokenPayload {
  sub: string;
}

@Injectable()
export class DecodeTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async decodeRefreshToken(token: string): Promise<{ id: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        { secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      if (!payload.sub) throw new Error('Missing subject');
      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
