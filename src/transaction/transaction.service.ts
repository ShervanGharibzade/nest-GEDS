import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SplitStatus } from '../prisma/generated/enums.js';
import { Transaction } from '../prisma/generated/client.js';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createTransactionDto: CreateTransactionDto) {
    const { expenseId } = createTransactionDto;

    return this.prisma.$transaction(async (tx) => {
      const split = await tx.expenseSplit.findUnique({
        where: {
          expenseId_userId: {
            expenseId,
            userId: createTransactionDto.fromUserId,
          },
          expense: {
            groupId: createTransactionDto.groupId,
          },
          status: { not: SplitStatus.PAID },
        },
        include: {
          expense: true,
        },
      });

      if (!split) {
        throw new NotFoundException('Expense split not found');
      }

      const amount = BigInt(createTransactionDto.amount);

      if (split.amount !== amount) {
        throw new ForbiddenException('Amount must equal debt');
      }

      if (split.status === SplitStatus.PAID) {
        throw new ForbiddenException('This expense is already paid');
      }

      const updatedSplit = await tx.expenseSplit.update({
        where: {
          expenseId_userId: {
            expenseId,
            userId: createTransactionDto.fromUserId,
          },
          expense: {
            groupId: createTransactionDto.groupId,
          },
        },
        data: {
          status: SplitStatus.PAID,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          groupId: split.expense.groupId,
          fromUserId: createTransactionDto.fromUserId,
          toUserId: split.expense.paidById,
          expenseId: createTransactionDto.expenseId,
          amount: split.amount,
        },
      });

      return transaction;
    });
  }

  async myTransactions(userId: number): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        fromUserId: userId,
      },
    });

    if (transactions.length < 0) {
      throw new NotFoundException('you have not create transaction yet.');
    }

    return transactions;
  }

  async findOne(userId: number, transactionId: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        fromUserId: userId,
        id: transactionId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not founded.');
    }

    return transaction;
  }
}
