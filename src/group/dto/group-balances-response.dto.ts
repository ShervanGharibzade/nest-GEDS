export class MemberBalanceDto {
  userId: number;
  name: string;
  email: string;
  /** Sum of amounts for expenses this user paid for in the group. */
  totalPaid: string;
  /** Sum of this user's share across all expenses in the group. */
  totalOwed: string;
  /** totalPaid - totalOwed. Positive: the group owes this user. Negative: this user owes the group. */
  netBalance: string;
}

export class DebtDto {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: string;
}

export class GroupBalancesResponseDto {
  groupId: number;
  balances: MemberBalanceDto[];
  /** Outstanding (unpaid) debts, netted between each pair of members. */
  debts: DebtDto[];
}
