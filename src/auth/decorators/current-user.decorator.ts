// auth/decorators/current-user.decorator.ts
//
// Reads the identity that JwtStrategy.validate() attached to the request as
// `req.user` after verifying the access-token JWT. This is the ONLY
// supported way for controllers to know "who is calling" on protected
// endpoints - the refresh-token cookie must never be used for this, since
// it is only meant to mint new access tokens.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../../prisma/generated/enums.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    return data ? user?.[data] : user;
  },
);
