-- Add RecurringRaidTemplate model and recurringTemplateId to RaidEvent

CREATE TABLE "RecurringRaidTemplate" (
    "id"            TEXT NOT NULL,
    "guildId"       TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "raidZone"      TEXT NOT NULL,
    "dayOfWeek"     INTEGER NOT NULL,
    "startTime"     TEXT NOT NULL,
    "maxAttendees"  INTEGER NOT NULL DEFAULT 25,
    "minItemLevel"  INTEGER,
    "description"   TEXT,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringRaidTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RecurringRaidTemplate" ADD CONSTRAINT "RecurringRaidTemplate_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RaidEvent" ADD COLUMN "recurringTemplateId" TEXT;

ALTER TABLE "RaidEvent" ADD CONSTRAINT "RaidEvent_recurringTemplateId_fkey"
    FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringRaidTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
