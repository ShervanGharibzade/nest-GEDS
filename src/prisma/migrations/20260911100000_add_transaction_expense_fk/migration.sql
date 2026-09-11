ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Transaction_expenseId_idx" ON "Transaction"("expenseId");
