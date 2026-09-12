export class TransactionResponseDto {
  id: number;
  uuid: string;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  expenseId: number;
  amount: string;
  description: string | null;
  createdAt: Date;
}

type TransactionLike = {
  id: number;
  uuid: string;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  expenseId: number;
  amount: bigint;
  description: string | null;
  createdAt: Date;
};

export function toTransactionResponse(
  transaction: TransactionLike,
): TransactionResponseDto {
  return {
    id: transaction.id,
    uuid: transaction.uuid,
    groupId: transaction.groupId,
    fromUserId: transaction.fromUserId,
    toUserId: transaction.toUserId,
    expenseId: transaction.expenseId,
    amount: transaction.amount.toString(),
    description: transaction.description,
    createdAt: transaction.createdAt,
  };
}
