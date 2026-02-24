-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('GM', 'OFFICER', 'MEMBER', 'TRIALIST');

-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('TANK', 'HEALER', 'DPS');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('ACCEPTED', 'TENTATIVE', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "bnetId" TEXT NOT NULL,
    "battletag" TEXT NOT NULL,
    "bnetRegion" TEXT NOT NULL DEFAULT 'eu',
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "slug" TEXT NOT NULL,
    "bnetGuildId" TEXT,
    "wclGuildId" TEXT,
    "wclGuildName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "role" "GuildRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "class" TEXT NOT NULL,
    "spec" TEXT,
    "role" "CharacterRole" NOT NULL DEFAULT 'DPS',
    "itemLevel" INTEGER,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidEvent" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raidZone" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "maxAttendees" INTEGER NOT NULL DEFAULT 25,
    "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" TEXT NOT NULL,
    "raidEventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'TENTATIVE',
    "role" "CharacterRole",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterSlot" (
    "id" TEXT NOT NULL,
    "raidEventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL DEFAULT 1,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "RosterSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogReport" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "wclCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "zone" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "fightCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterParse" (
    "id" TEXT NOT NULL,
    "logReportId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "fightName" TEXT NOT NULL,
    "difficulty" TEXT,
    "parsePercent" DOUBLE PRECISION,
    "dps" DOUBLE PRECISION,
    "hps" DOUBLE PRECISION,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "outOf" INTEGER,

    CONSTRAINT "CharacterParse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_bnetId_key" ON "User"("bnetId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_slug_key" ON "Guild"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMembership_userId_guildId_key" ON "GuildMembership"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_realm_region_key" ON "Character"("name", "realm", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_raidEventId_characterId_key" ON "Signup"("raidEventId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterSlot_raidEventId_slotIndex_key" ON "RosterSlot"("raidEventId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LogReport_wclCode_key" ON "LogReport"("wclCode");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterParse_logReportId_characterId_fightName_key" ON "CharacterParse"("logReportId", "characterId", "fightName");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidEvent" ADD CONSTRAINT "RaidEvent_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signup" ADD CONSTRAINT "Signup_raidEventId_fkey" FOREIGN KEY ("raidEventId") REFERENCES "RaidEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signup" ADD CONSTRAINT "Signup_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterSlot" ADD CONSTRAINT "RosterSlot_raidEventId_fkey" FOREIGN KEY ("raidEventId") REFERENCES "RaidEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterSlot" ADD CONSTRAINT "RosterSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogReport" ADD CONSTRAINT "LogReport_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterParse" ADD CONSTRAINT "CharacterParse_logReportId_fkey" FOREIGN KEY ("logReportId") REFERENCES "LogReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterParse" ADD CONSTRAINT "CharacterParse_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
