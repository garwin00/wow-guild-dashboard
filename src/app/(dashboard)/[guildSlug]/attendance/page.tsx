import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import AttendanceClient from "./AttendanceClient";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Track raid attendance across your ZugZug guild roster.",
};

export default async function AttendancePage({ params }: { params: Promise<{ guildSlug: string }> }) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/login");
  const isOfficer = ["GM", "OFFICER"].includes(membership.role);
  return <AttendanceClient guildSlug={guildSlug} isOfficer={isOfficer} />;
}
