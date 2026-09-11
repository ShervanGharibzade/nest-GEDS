-- Populate UUIDs at the database level so this migration works on non-empty tables.
-- gen_random_uuid() is available in supported PostgreSQL versions without enabling an extension.
ALTER TABLE "Expense" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ExpenseSplit" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Group" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "GroupMember" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Transaction" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "User" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "Expense_uuid_key" ON "Expense"("uuid");
CREATE UNIQUE INDEX "ExpenseSplit_uuid_key" ON "ExpenseSplit"("uuid");
CREATE UNIQUE INDEX "Group_uuid_key" ON "Group"("uuid");
CREATE UNIQUE INDEX "GroupMember_uuid_key" ON "GroupMember"("uuid");
CREATE UNIQUE INDEX "Transaction_uuid_key" ON "Transaction"("uuid");
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");
