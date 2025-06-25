/*
  Warnings:

  - Added the required column `winner` to the `Record` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Record" DROP COLUMN "winner",
ADD COLUMN     "winner" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Winner";
