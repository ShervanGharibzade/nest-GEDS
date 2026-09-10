export class CreateTransactionDto {
  groupId: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  description?: string;
  group: number;
  expenseId: number;
  fromUser: number;
  toUser: number;
}
