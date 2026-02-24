import { NextRequest, NextResponse } from "next/server";
import { getCurrentAffixes } from "@/lib/raiderio";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "eu";
  const affixes = await getCurrentAffixes(region);
  if (!affixes) return NextResponse.json({ error: "Could not fetch affixes" }, { status: 502 });
  return NextResponse.json(affixes, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
