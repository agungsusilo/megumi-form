import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isClosedDate } from "@/lib/constants";

const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "megumi-media";
const MAX_PROOF_SIZE = 5 * 1024 * 1024; // 5MB, matches the bucket's file_size_limit
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  const body: Record<string, string> = {};
  let proofFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (key === "paymentProof" && value instanceof File) {
        if (value.size > 0) proofFile = value;
      } else if (typeof value === "string") {
        body[key] = value;
      }
    }
  } else {
    try {
      Object.assign(body, await req.json());
    } catch {
      return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
    }
  }

  const { fullName, email, whatsapp, bookingDate, bookingTime, accessories, accessoryDetails, attire, pendamping, fotografer } = body;

  if (!fullName?.trim() || !email?.trim() || !whatsapp?.trim() || !bookingDate || !bookingTime || !pendamping?.trim()) {
    return NextResponse.json({ error: "Field wajib belum diisi." }, { status: 400 });
  }

  if (isClosedDate(bookingDate)) {
    return NextResponse.json({ error: "Studio libur pada hari Jumat. Silakan pilih tanggal lain." }, { status: 400 });
  }

  if (!proofFile) {
    return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
  }
  if (proofFile.size > MAX_PROOF_SIZE) {
    return NextResponse.json({ error: "Ukuran bukti pembayaran maksimal 5MB." }, { status: 400 });
  }
  if (!ALLOWED_PROOF_TYPES.includes(proofFile.type)) {
    return NextResponse.json({ error: "Format bukti pembayaran harus JPG, PNG, atau WEBP." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const ext = proofFile.name.split(".").pop() || "jpg";
  const path = `studio-payment-proofs/${bookingDate}/${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await proofFile.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, { contentType: proofFile.type, upsert: false });

  if (uploadError) {
    console.error("[booking/route] Upload bukti pembayaran gagal:", uploadError);
    return NextResponse.json({ error: "Gagal mengunggah bukti pembayaran. Silakan coba lagi." }, { status: 500 });
  }

  const paymentProofUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  // row_number is `not null unique` and shared with the Sheet-sourced rows (which use
  // positive physical row numbers, always >= 2). Bookings from this form use a negative
  // placeholder that can never collide with those, then get pinned to -id right after
  // insert so every row's row_number is permanently unique.
  const tempRowNumber = -(Date.now() % 1_000_000_000) - Math.floor(Math.random() * 1000) - 1;

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
      payment_proof: paymentProofUrl,
      status: "PENDING",
      row_number: tempRowNumber,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[booking/route] Supabase error:", dbError);
    return NextResponse.json({ error: "Gagal menyimpan booking. Silakan coba lagi." }, { status: 500 });
  }

  const { error: fixupError } = await supabase
    .from("bookings")
    .update({ row_number: -booking.id })
    .eq("id", booking.id);
  if (fixupError) {
    console.error("[booking/route] Gagal finalisasi row_number:", fixupError);
  }

  // Undangan Google Calendar sengaja TIDAK dibuat di sini — hanya dikirim saat admin
  // mengubah status booking menjadi CONFIRM lewat dashboard (diatur oleh Apps Script).

  return NextResponse.json({ ok: true, id: booking.id });
}
