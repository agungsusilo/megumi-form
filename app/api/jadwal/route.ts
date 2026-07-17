import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { classifySession, type SessionCounts } from "@/lib/constants";

export const dynamic = "force-dynamic";

function toIso(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return null;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, booking_time, status")
    .not("status", "eq", "CANCEL")
    .not("status", "ilike", "cancel%")
    .order("booking_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Gagal memuat jadwal." }, { status: 500 });
  }

  // Sesi Pagi (09-13) and Sesi Sore (15-19) both overlap a Full Day (09-18) booking,
  // so each classified session bumps the counts of every session it physically overlaps —
  // same effect as the Apps Script's calendar.getEvents(start,end) overlap check.
  const byDate = new Map<string, SessionCounts>();
  function bump(date: string, keys: (keyof SessionCounts)[]) {
    if (!byDate.has(date)) byDate.set(date, { pagi: 0, sore: 0, full: 0 });
    const counts = byDate.get(date)!;
    for (const k of keys) counts[k] += 1;
  }

  for (const row of data || []) {
    const iso = toIso(row.booking_date || "");
    if (!iso) continue;
    const session = classifySession(row.booking_time || "");
    if (session === "pagi") bump(iso, ["pagi", "full"]);
    else if (session === "sore") bump(iso, ["sore", "full"]);
    else if (session === "full") bump(iso, ["pagi", "sore", "full"]);
  }

  const dates = Array.from(byDate.entries()).map(([date, counts]) => ({ date, ...counts }));

  return NextResponse.json({ dates }, { headers: { "Cache-Control": "no-store" } });
}
