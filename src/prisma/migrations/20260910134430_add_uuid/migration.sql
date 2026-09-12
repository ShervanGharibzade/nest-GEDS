/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `ExpenseSplit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `GroupMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `Expense` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.
  - The required column `uuid` was added to the `ExpenseSplit` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.
  - The required column `uuid` was added to the `Group` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.
  - The required column `uuid` was added to the `GroupMember` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.
  - The required column `uuid` was added to the `Transaction` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.
  - The required column `uuid` was added to the `User` table. Existing rows are backfilled with generated UUIDs via a temporary DB-level default.

  NOTE: The original migration added these columns as NOT NULL with only a
  Prisma-level (application) default, which is not a DB default. That fails
  with "column contains null values" against any database that already has
  rows. This corrected version:
    1. enables pgcrypto so gen_random_uuid() is available,
    2. adds each column with a DB-level default so existing rows are
       backfilled automatically,
    3. drops the DB-level default afterwards so Prisma's client-side
       @default(uuid()) is the only thing generating new values going
       forward (keeping behaviour identical to what the schema declares).
*/

-- Enable UUID generation support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Expense" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExpenseSplit" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "ExpenseSplit" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Group" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "GroupMember" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Transaction" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "User" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_uuid_key" ON "Expense"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_uuid_key" ON "ExpenseSplit"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Group_uuid_key" ON "Group"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_uuid_key" ON "GroupMember"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_uuid_key" ON "Transaction"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");
