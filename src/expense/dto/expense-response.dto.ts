export class ExpenseSplitResponseDto {
  uuid: string;
  user: { uuid: string; name: string; email: string };
  amount: string;
  status: 'PAID' | 'UNPAID';
}

export class ExpenseResponseDto {
  uuid: string;
  description: string;
  amount: string;
  status: 'OPEN' | 'CLOSE';
  group: { uuid: string; name: string };
  paidBy: { uuid: string; name: string; email: string };
  splits: ExpenseSplitResponseDto[];
  createdAt: Date;
}
