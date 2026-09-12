import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Centralized, predictable error factories. Using these instead of ad-hoc
 * `throw new XException('...')` calls scattered through services keeps
 * error responses consistent across the API and makes them easy to audit
 * (see TODO section 15 — Error Handling).
 *
 * None of these leak internal/sensitive details (stack traces, DB errors,
 * query values) — only a safe, generic message is ever returned to the
 * client.
 */
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

  GROUP: {
    NOT_FOUND: (): NotFoundException => new NotFoundException('Group not found'),

    NOT_OWNER: (action = 'do this'): ForbiddenException =>
      new ForbiddenException(`Only the group owner can ${action}`),

    NOT_MEMBER: (): ForbiddenException =>
      new ForbiddenException('You must be a member of this group'),
  },

  GROUP_MEMBER: {
    NOT_FOUND: (): NotFoundException =>
      new NotFoundException('Group member not found'),

    ALREADY_MEMBER: (): ConflictException =>
      new ConflictException('User is already a member of this group'),

    CANNOT_REMOVE_OWNER: (): ForbiddenException =>
      new ForbiddenException('The group owner cannot be removed from the group'),

    HAS_UNRESOLVED_DEBTS: (): ForbiddenException =>
      new ForbiddenException(
        'This member has unresolved debts in the group and cannot be removed',
      ),
  },

  EXPENSE: {
    NOT_FOUND: (): NotFoundException =>
      new NotFoundException('Expense not found'),

    INVALID_AMOUNT: (): BadRequestException =>
      new BadRequestException('Amount must be a positive integer'),

    CLOSED: (): ConflictException =>
      new ConflictException(
        'This expense is closed and no longer accepts payments',
      ),
  },

  EXPENSE_SPLIT: {
    NOT_FOUND: (): NotFoundException =>
      new NotFoundException('Expense split not found'),

    ALREADY_PAID: (): ConflictException =>
      new ConflictException('This split has already been paid'),

    WRONG_AMOUNT: (expected: string): BadRequestException =>
      new BadRequestException(
        `Payment amount must equal the outstanding debt of ${expected}`,
      ),
  },

  TRANSACTION: {
    NOT_FOUND: (): NotFoundException =>
      new NotFoundException('Transaction not found'),
  },
} as const;
