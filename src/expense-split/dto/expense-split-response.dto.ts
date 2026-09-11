export class ExpenseSplitResponseDto {
  uuid: string;
  expenseId: string;
  amount: string;
  status: 'PAID' | 'UNPAID';
  user: { uuid: string; name: string; email: string };
}
