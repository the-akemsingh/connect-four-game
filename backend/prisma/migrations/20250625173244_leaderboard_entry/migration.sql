-- CreateEnum
CREATE TYPE "Winner" AS ENUM ('player1', 'player2');

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player1" TEXT NOT NULL,
    "player2" TEXT NOT NULL,
    "winner" "Winner",

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);
