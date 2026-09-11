/**
 * Expense splits are intentionally not writable through the public API.
 * Splits are created and paid only through ExpenseService/TransactionService.
 */
export class CreateExpenseSplitDto {}
