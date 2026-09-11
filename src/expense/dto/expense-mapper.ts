import { Expense, ExpenseStatus } from '../../prisma/generated/client.js';

interface ExpenseMap {
  uuid: string;
  groupId: number;
  paidById: number;
  description: string;
  status: ExpenseStatus;
  amount: bigint;
  createdAt: Date;
}

export function ExpenseMapper(data: Expense): ExpenseMap {
  return {
    uuid: data.uuid,
    groupId: data.groupId,
    paidById: data.paidById,
    description: data.description,
    status: data.status,
    amount: data.amount,
    createdAt: data.createdAt,
  };
}
