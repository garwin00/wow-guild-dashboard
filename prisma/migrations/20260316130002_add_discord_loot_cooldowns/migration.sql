-- AlterTable: add Discord webhook fields to Guild
ALTER TABLE "Guild" ADD COLUMN "discordWebhook" TEXT,
                    ADD COLUMN "discordWebhookEvents" TEXT;

-- CreateTable: DiscordWebhookLog
CREATE TABLE "DiscordWebhookLog" (
    "id"      TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "event"   TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "sentAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    CONSTRAINT "DiscordWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LootRecord
CREATE TABLE "LootRecord" (
    "id"          TEXT NOT NULL,
    "guildId"     TEXT NOT NULL,
    "raidEventId" TEXT,
    "characterId" TEXT NOT NULL,
    "itemName"    TEXT NOT NULL,
    "itemLevel"   INTEGER NOT NULL,
    "bossName"    TEXT,
    "source"      TEXT NOT NULL DEFAULT 'MANUAL',
    "awardedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LootRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CooldownAssignment
CREATE TABLE "CooldownAssignment" (
    "id"           TEXT NOT NULL,
    "raidEventId"  TEXT NOT NULL,
    "bossName"     TEXT NOT NULL,
    "pullNumber"   INTEGER NOT NULL DEFAULT 1,
    "characterId"  TEXT NOT NULL,
    "cooldownName" TEXT NOT NULL,
    "targetNote"   TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CooldownAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: DiscordWebhookLog → Guild
ALTER TABLE "DiscordWebhookLog" ADD CONSTRAINT "DiscordWebhookLog_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LootRecord → Guild
ALTER TABLE "LootRecord" ADD CONSTRAINT "LootRecord_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LootRecord → RaidEvent (nullable, SetNull on delete)
ALTER TABLE "LootRecord" ADD CONSTRAINT "LootRecord_raidEventId_fkey"
    FOREIGN KEY ("raidEventId") REFERENCES "RaidEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LootRecord → Character
ALTER TABLE "LootRecord" ADD CONSTRAINT "LootRecord_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CooldownAssignment → RaidEvent
ALTER TABLE "CooldownAssignment" ADD CONSTRAINT "CooldownAssignment_raidEventId_fkey"
    FOREIGN KEY ("raidEventId") REFERENCES "RaidEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CooldownAssignment → Character
ALTER TABLE "CooldownAssignment" ADD CONSTRAINT "CooldownAssignment_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
