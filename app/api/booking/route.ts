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

// Mirrors megumi-dashboard's uploadCompressedImage (lib/media-storage.ts): downscale to a
// max side of 1800px and re-encode as WebP before it ever lands in the bucket. Falls back
// to the original buffer if sharp is unavailable in the runtime, same as the dashboard does.
async function compressImage(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(buffer).metadata();
    const maxSide = 1800;
    const compressed = await sharp(buffer)
      .rotate()
      .resize({
        width: metadata.width && metadata.width >= (metadata.height || 0) ? maxSide : undefined,
        height: metadata.height && metadata.height > (metadata.width || 0) ? maxSide : undefined,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    return { buffer: compressed, contentType: "image/webp", ext: "webp" };
  } catch (err) {
    console.warn("[booking/route] Sharp unavailable, uploading original image without compression:", err instanceof Error ? err.message : err);
    return { buffer, contentType: "image/jpeg", ext: "jpg" };
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  const body: Record<string, string> = {};
  let proofFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      // Avoid `instanceof File` — Node 18 doesn't expose File as a global (added in Node 20),
      // and the File class Next.js's multipart parser uses may not match a locally imported one anyway.
      if (key === "paymentProof" && typeof value !== "string") {
        if (value.size > 0) proofFile = value as File;
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

  if (!fullName?.trim() || !email?.trim() || !whatsapp?.trim() || !bookingDate || !bookingTime
    || !accessories?.trim() || !attire?.trim() || !pendamping?.trim() || !fotografer?.trim()) {
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

  let uploadError: unknown = null;
  let path = "";
  try {
    const originalBuffer = Buffer.from(await proofFile.arrayBuffer());
    const { buffer, contentType, ext } = await compressImage(originalBuffer);
    path = `studio-payment-proofs/${bookingDate}/${Date.now()}-${randomUUID()}.${ext}`;
    const res = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    uploadError = res.error;
  } catch (err) {
    console.error("[booking/route] Upload bukti pembayaran exception:", err);
    return NextResponse.json({ error: "Gagal mengunggah bukti pembayaran. Silakan coba lagi." }, { status: 500 });
  }

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
