-- No catch-ups have been saved yet, so the required column needs no backfill.
-- AlterTable
ALTER TABLE "SavedCatchup" ADD COLUMN     "clientId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SavedCatchup_userId_clientId_key" ON "SavedCatchup"("userId", "clientId");
