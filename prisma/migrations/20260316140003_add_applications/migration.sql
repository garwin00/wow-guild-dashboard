-- Add GuildApplication model and recruiting fields to Guild

ALTER TABLE "Guild" ADD COLUMN "isPublic"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guild" ADD COLUMN "recruitMessage" TEXT;

CREATE TABLE "GuildApplication" (
    "id"            TEXT NOT NULL,
    "guildId"       TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "realm"         TEXT NOT NULL,
    "class"         TEXT NOT NULL,
    "role"          TEXT NOT NULL,
    "message"       TEXT,
    "discordTag"    TEXT,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById"  TEXT,
    "reviewNote"    TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildApplication_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GuildApplication" ADD CONSTRAINT "GuildApplication_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuildApplication" ADD CONSTRAINT "GuildApplication_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
