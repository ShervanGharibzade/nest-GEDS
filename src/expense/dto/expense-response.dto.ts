export class ExpenseSplitSummaryDto {
  id: number;
  uuid: string;
  userId: number;
  amount: string;
  status: string;
}

export class ExpenseResponseDto {
  id: number;
  uuid: string;
  groupId: number;
  description: string;
  status: string;
  amount: string;
  paidById: number;
  paidByName: string;
  createdAt: Date;
  splits?: ExpenseSplitSummaryDto[];
}

type ExpenseWithRelations = {
  id: number;
  uuid: string;
  groupId: number;
  description: string;
  status: string;
  amount: bigint;
  paidById: number;
  paidBy: { name: string };
  createdAt: Date;
  splits?: {
    id: number;
    uuid: string;
    userId: number;
    amount: bigint;
    status: string;
  }[];
};

export function toExpenseResponse(
  expense: ExpenseWithRelations,
): ExpenseResponseDto {
  return {
    id: expense.id,
    uuid: expense.uuid,
    groupId: expense.groupId,
    description: expense.description,
    status: expense.status,
    amount: expense.amount.toString(),
    paidById: expense.paidById,
    paidByName: expense.paidBy.name,
    createdAt: expense.createdAt,
    splits: expense.splits?.map((s) => ({
      id: s.id,
      uuid: s.uuid,
      userId: s.userId,
      amount: s.amount.toString(),
      status: s.status,
    })),
  };
}
