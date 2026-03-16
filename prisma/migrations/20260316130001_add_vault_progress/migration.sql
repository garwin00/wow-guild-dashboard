-- AlterTable: add Great Vault weekly progress fields to Character
ALTER TABLE "Character" ADD COLUMN "vaultSlot1" INTEGER,
                        ADD COLUMN "vaultSlot2" INTEGER,
                        ADD COLUMN "vaultSlot3" INTEGER,
                        ADD COLUMN "vaultUpdatedAt" TIMESTAMP(3);
