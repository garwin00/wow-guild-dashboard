-- Add trial tracking fields to GuildMembership
ALTER TABLE "GuildMembership" ADD COLUMN "trialStartDate" TIMESTAMP(3);
ALTER TABLE "GuildMembership" ADD COLUMN "trialReviewDate" TIMESTAMP(3);
