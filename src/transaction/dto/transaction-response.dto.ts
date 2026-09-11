export class TransactionResponseDto {
  uuid: string;
  expenseId: string;
  groupId: string;
  amount: string;
  description?: string | null;
  fromUser: { uuid: string; name: string; email: string };
  toUser: { uuid: string; name: string; email: string };
  createdAt: Date;
}
