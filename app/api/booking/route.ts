import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createBookingCalendarEvent } from "@/lib/google-calendar";

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const { fullName, email, whatsapp, bookingDate, bookingTime, accessories, accessoryDetails, attire, pendamping, fotografer } = body;

  if (!fullName?.trim() || !email?.trim() || !whatsapp?.trim() || !bookingDate || !bookingTime) {
    return NextResponse.json({ error: "Field wajib belum diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: booking, error: dbError } = await supabase
    .from("bookings")
    .insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      booking_date: isoToDMY(bookingDate),
      booking_time: bookingTime,
      accessories: accessories?.trim() || "",
      accessory_details: accessoryDetails?.trim() || "",
      attire: attire?.trim() || "",
      pendamping: pendamping?.trim() || "",
      fotografer: fotografer?.trim() || "",
      status: "Pending",
      row_number: 0,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[booking/route] Supabase error:", dbError);
    return NextResponse.json({ error: "Gagal menyimpan booking. Silakan coba lagi." }, { status: 500 });
  }

  // Create calendar event — non-blocking on failure
  try {
    const calResult = await createBookingCalendarEvent({
      fullName, email, whatsapp, bookingDate, bookingTime, accessories, accessoryDetails, attire,
    });
    if (calResult.ok && calResult.eventId) {
      await supabase.from("bookings").update({ event_id: calResult.eventId }).eq("id", booking.id);
    }
    if (!calResult.ok && !calResult.skipped) {
      console.warn("[booking/route] Calendar event gagal:", calResult.reason);
    }
  } catch (err) {
    console.error("[booking/route] Calendar exception:", err);
  }

  return NextResponse.json({ ok: true, id: booking.id });
}
