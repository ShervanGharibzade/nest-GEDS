-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('OPEN', 'CLOSE');

-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "ExpenseSplit" ADD COLUMN     "status" "SplitStatus" NOT NULL DEFAULT 'UNPAID';
