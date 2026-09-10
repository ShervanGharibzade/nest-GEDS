import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ExpenseService } from './expense.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import type { Request } from 'express';
import { DecodeTokenService } from '../auth/jwt/decode-token.service.js';

@Controller('expense')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly decodeTokenService: DecodeTokenService,
  ) {}

  @Post()
  async create(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: Request,
  ): Promise<string> {
    const refreshToken = this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.expenseService.create(createExpenseDto, id);
  }

  @Get()
  findAll() {
    return this.expenseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseService.findOne(+id);
  }

  private extractRefreshToken(request: Request): string {
    const token = request.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token;
  }
}
