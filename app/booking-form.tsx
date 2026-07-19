"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  SESSION_OPTIONS, isSessionFull, isClosedDate,
  ACCESSORY_OPTIONS, ADAT_ACCESSORY_OPTION, ADAT_DETAIL_OPTIONS,
  ATTIRE_OPTIONS, YES_NO_OPTIONS,
  type SessionCounts,
} from "@/lib/constants";
import { BookingCalendar } from "./booking-calendar";

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  bookingDate: string;
  bookingTime: string;
  attire: string;
  pendamping: string;
  fotografer: string;
};

const INITIAL: FormState = {
  fullName: "", email: "", whatsapp: "", bookingDate: "", bookingTime: "",
  attire: "", pendamping: "", fotografer: "",
};

const DRAFT_KEY = "megumi-booking-draft-v1";
const SECTION_LABELS = ["Data Diri", "Jadwal", "Detail Sesi", "Pembayaran"];
const MAX_PROOF_UPLOAD_SIZE = 20 * 1024 * 1024; // sanity cap before compression, not the final upload size
const TARGET_PROOF_SIZE = 1 * 1024 * 1024; // compress down to under ~1MB

async function encodeAtSize(bitmap: ImageBitmap, side: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Downscale + re-encode in the browser before upload — Vercel's serverless functions reject
// request bodies over ~4.5MB (returns a non-JSON error page), so a phone photo needs to be
// shrunk client-side; compressing only after it reaches the server (in route.ts) is too late.
// Iterates quality, then dimensions, until the result fits TARGET_PROOF_SIZE.
async function compressImageFile(file: File, maxSide = 1800): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let best: Blob | null = null;
    let side = maxSide;

    outer:
    for (let pass = 0; pass < 6; pass++) {
      for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
        const blob = await encodeAtSize(bitmap, side, quality);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_PROOF_SIZE) break outer;
      }
      side = Math.round(side * 0.75);
    }

    bitmap.close();
    if (!best || best.size >= file.size) return file;
    return new File([best], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // unsupported format/browser quirk — fall back to the original file
  }
}

// Options are stored as "<Nama> - <Harga>" (matches the source Google Form's exact wording,
// which is also the literal value saved to the database) — split only for display.
function splitPrice(raw: string): { name: string; price: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx === -1) return { name: raw, price: "" };
  return { name: raw.slice(0, idx).trim(), price: raw.slice(idx + 3).trim() };
}

function PriceBadge({ price }: { price: string }) {
  const isFree = price.trim().toLowerCase() === "free";
  return (
    <span className={[
      "ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
      isFree ? "bg-emerald-50 text-emerald-600" : "bg-gold-100 text-gold-700",
    ].join(" ")}>
      {price}
    </span>
  );
}

// Maps the color names used in ADAT_DETAIL_OPTIONS to a badge that reads as that color.
function getColorBadgeClasses(color: string): string {
  const key = color.trim().toLowerCase();
  if (key.includes("rose gold")) return "bg-rose-100 text-rose-700";
  if (key.includes("merah")) return "bg-red-100 text-red-700";
  if (key.includes("silver")) return "bg-slate-200 text-slate-700";
  if (key.includes("gold")) return "bg-gold-100 text-gold-700";
  return "bg-gold-100 text-gold-700";
}

function ColorBadge({ color }: { color: string }) {
  return (
    <span className={[
      "ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
      getColorBadgeClasses(color),
    ].join(" ")}>
      {color}
    </span>
  );
}

function RadioOption({ name, label, price, color, checked, onChange, disabled }: {
  name: string; label: string; price?: string; color?: string; checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <label className={[
      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
      checked ? "border-gold-400 bg-gold-50/50" : "border-gold-100 bg-white hover:border-gold-300",
      disabled ? "cursor-not-allowed opacity-60" : "",
    ].join(" ")}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 shrink-0 border-gold-300 text-gold-600 focus:ring-gold-400"
      />
      <span className="flex-1 text-stone-700">{label}</span>
      {color ? <ColorBadge color={color} /> : price && <PriceBadge price={price} />}
    </label>
  );
}

function CheckboxOption({ label, price, checked, onChange, disabled }: {
  label: string; price?: string; checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <label className={[
      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
      checked ? "border-gold-400 bg-gold-50/50" : "border-gold-100 bg-white hover:border-gold-300",
      disabled ? "cursor-not-allowed opacity-60" : "",
    ].join(" ")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 shrink-0 rounded border-gold-300 text-gold-600 focus:ring-gold-400"
      />
      <span className="flex-1 text-stone-700">{label}</span>
      {price && <PriceBadge price={price} />}
    </label>
  );
}

function YesNoToggle({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-gold-100 bg-stone-50 p-1">
      {YES_NO_OPTIONS.map((opt) => {
        const checked = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={disabled}
            className={[
              "rounded-md py-2 text-sm font-semibold transition",
              checked ? "bg-gold-600 text-white shadow-sm" : "text-stone-500 hover:bg-white hover:text-stone-700",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function BookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [adatDetail, setAdatDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookedDates, setBookedDates] = useState<Record<string, SessionCounts>>({});
  const [loadingBookedDates, setLoadingBookedDates] = useState(true);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [compressingProof, setCompressingProof] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showProofLightbox, setShowProofLightbox] = useState(false);
  const [activeSection, setActiveSection] = useState(1);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  const fullNameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const bookingDateRef = useRef<HTMLDivElement>(null);
  const bookingTimeRef = useRef<HTMLDivElement>(null);
  const accessoriesRef = useRef<HTMLDivElement>(null);
  const adatDetailRef = useRef<HTMLDivElement>(null);
  const attireRef = useRef<HTMLDivElement>(null);
  const pendampingRef = useRef<HTMLDivElement>(null);
  const fotograferRef = useRef<HTMLDivElement>(null);
  const paymentProofRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jadwal")
      .then((res) => res.json())
      .then((data: { dates?: ({ date: string } & SessionCounts)[] }) => {
        if (cancelled) return;
        const map: Record<string, SessionCounts> = {};
        for (const d of data.dates || []) map[d.date] = { pagi: d.pagi, sore: d.sore, full: d.full };
        setBookedDates(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingBookedDates(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    };
  }, [paymentProofPreview]);

  // Restore a saved draft (text fields only — the payment proof file can't be persisted).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        const hasContent =
          (draft.form && Object.values(draft.form).some((v) => typeof v === "string" && v.trim())) ||
          (Array.isArray(draft.selectedAccessories) && draft.selectedAccessories.length > 0) ||
          (typeof draft.adatDetail === "string" && draft.adatDetail) ||
          draft.agreedToTerms === true;
        if (hasContent) {
          if (draft.form) setForm((prev) => ({ ...prev, ...draft.form }));
          if (Array.isArray(draft.selectedAccessories)) setSelectedAccessories(draft.selectedAccessories);
          if (typeof draft.adatDetail === "string") setAdatDetail(draft.adatDetail);
          if (typeof draft.agreedToTerms === "boolean") setAgreedToTerms(draft.agreedToTerms);
          setDraftRestored(true);
        }
      }
    } catch {}
    setIsDraftLoaded(true);
  }, []);

  // Autosave — gated on isDraftLoaded so we never overwrite a not-yet-restored draft with initial/stale state.
  // Skips writing entirely while the form is still empty, so a visit with no input never creates a "restorable" draft.
  useEffect(() => {
    if (!isDraftLoaded) return;
    const hasContent =
      Object.values(form).some((v) => v.trim()) ||
      selectedAccessories.length > 0 ||
      adatDetail !== "" ||
      agreedToTerms;
    try {
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, selectedAccessories, adatDetail, agreedToTerms }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {}
  }, [isDraftLoaded, form, selectedAccessories, adatDetail, agreedToTerms]);

  // Sticky progress indicator — tracks which numbered section is currently in view.
  useEffect(() => {
    const sections = [
      { ref: section1Ref, num: 1 },
      { ref: section2Ref, num: 2 },
      { ref: section3Ref, num: 3 },
      { ref: section4Ref, num: 4 },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const match = sections.find((s) => s.ref.current === entry.target);
            if (match) setActiveSection(match.num);
          }
        });
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => s.ref.current && observer.observe(s.ref.current));
    return () => observer.disconnect();
  }, []);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
    };
  }

  function selectDate(date: string) {
    setForm((prev) => ({ ...prev, bookingDate: date, bookingTime: "" }));
    setError("");
  }

  function toggleAccessory(label: string) {
    setSelectedAccessories((prev) => {
      const next = prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label];
      if (!next.includes(ADAT_ACCESSORY_OPTION)) setAdatDetail("");
      return next;
    });
    setError("");
  }

  async function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format bukti pembayaran harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > MAX_PROOF_UPLOAD_SIZE) {
      setError("Ukuran file terlalu besar. Silakan gunakan foto dengan ukuran lebih kecil.");
      return;
    }

    setError("");
    setCompressingProof(true);
    const compressed = await compressImageFile(file);
    setCompressingProof(false);

    setPaymentProof(compressed);
    setPaymentProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(compressed);
    });
  }

  function removeProof() {
    setPaymentProof(null);
    setPaymentProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setForm(INITIAL);
    setSelectedAccessories([]);
    setAdatDetail("");
    setAgreedToTerms(false);
    removeProof();
    setDraftRestored(false);
    setError("");
  }

  function fail(message: string, ref: React.RefObject<HTMLElement>) {
    setError(message);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.fullName.trim()) return fail("Nama lengkap wajib diisi.", fullNameRef);
    if (!form.email.trim()) return fail("Email wajib diisi.", emailRef);
    if (!form.whatsapp.trim()) return fail("No. WhatsApp wajib diisi.", whatsappRef);
    if (!form.bookingDate) return fail("Tanggal booking wajib dipilih.", bookingDateRef);
    if (isClosedDate(form.bookingDate)) return fail("Studio libur pada hari Jumat. Silakan pilih tanggal lain.", bookingDateRef);
    if (!form.bookingTime) return fail("Jam booking wajib dipilih.", bookingTimeRef);
    if (selectedAccessories.length === 0) return fail("Silakan pilih minimal satu Add On Aksesoris.", accessoriesRef);
    if (selectedAccessories.includes(ADAT_ACCESSORY_OPTION) && !adatDetail) {
      return fail("Silakan pilih detail aksesoris adat.", adatDetailRef);
    }
    if (!form.attire) return fail("Silakan pilih attire.", attireRef);
    if (!form.pendamping) return fail("Silakan pilih apakah membawa pendamping.", pendampingRef);
    if (!form.fotografer) return fail("Silakan pilih apakah ingin tambahan fotografer.", fotograferRef);
    if (!paymentProof) return fail("Bukti pembayaran wajib diunggah.", paymentProofRef);
    if (!agreedToTerms) return fail("Silakan setujui Ketentuan Reservasi dan Kebijakan Pembatalan terlebih dahulu.", termsRef);

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      for (const [key, value] of Object.entries(form)) fd.append(key, value);
      fd.append("accessories", selectedAccessories.join(", "));
      fd.append("accessoryDetails", selectedAccessories.includes(ADAT_ACCESSORY_OPTION) ? adatDetail : "");
      fd.append("paymentProof", paymentProof);
      const res = await fetch("/api/booking", { method: "POST", body: fd });

      let data: { error?: string; id?: number };
      try {
        data = await res.json();
      } catch {
        // Non-JSON response — usually an infra-level rejection (e.g. request body too
        // large) that never reached our route handler at all.
        throw new Error(
          res.status === 413
            ? "Ukuran file terlalu besar untuk diunggah. Silakan gunakan foto dengan ukuran lebih kecil."
            : "Terjadi kesalahan pada server. Silakan coba lagi."
        );
      }
      if (!res.ok) throw new Error(data.error || "Gagal mengirim booking.");

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}

      const params = new URLSearchParams({
        nama: form.fullName,
        tanggal: form.bookingDate,
        sesi: form.bookingTime,
      });
      router.push(`/sukses?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const showAdatDetail = selectedAccessories.includes(ADAT_ACCESSORY_OPTION);

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <Image
            src="/megumi-logo.png"
            alt="Megumi Beauty Studio"
            width={472}
            height={188}
            className="mx-auto h-auto w-64 object-contain"
            priority
          />
          <div className="mx-auto mt-3 mb-3 h-px w-16 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
          <h1 className="font-serif text-2xl italic text-gold-800">Booking Form - Megumi Beauty Studio</h1>
        </div>

        {/* Sticky progress indicator */}
        <div className="sticky top-2 z-20 mb-4 rounded-2xl border border-gold-100 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center">
            {SECTION_LABELS.map((label, i) => {
              const num = i + 1;
              const isActive = activeSection === num;
              const isDone = activeSection > num;
              return (
                <div key={num} className="flex flex-1 items-center last:flex-none">
                  <div
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition",
                      isActive ? "bg-gold-600 text-white" : isDone ? "bg-gold-300 text-white" : "bg-stone-100 text-stone-400",
                    ].join(" ")}
                  >
                    {num}
                  </div>
                  {num < SECTION_LABELS.length && (
                    <div className={`mx-1.5 h-px flex-1 transition ${isDone ? "bg-gold-300" : "bg-stone-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-gold-700">
            {SECTION_LABELS[activeSection - 1]}
          </p>
        </div>

        {draftRestored && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gold-200 bg-gold-50/60 px-4 py-2.5 text-xs text-stone-600">
            <span>📝 Draft sebelumnya berhasil dipulihkan.</span>
            <button
              type="button"
              onClick={clearDraft}
              className="shrink-0 font-medium text-gold-700 underline underline-offset-2 hover:text-gold-800"
            >
              Mulai baru
            </button>
          </div>
        )}

        {/* Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gold-100 bg-white/90 p-6 shadow-xl shadow-gold-900/5 backdrop-blur-sm">

          {/* Section 1: Data Diri */}
          <div className="form-section" ref={section1Ref}>
            <p className="form-section-title"><span className="form-section-badge">1</span>Data Diri</p>

            <div className="mb-4" ref={fullNameRef}>
              <label className="form-label">
                Nama Lengkap <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">Nama yang akan digunakan untuk data booking kamu.</p>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Putri Melati"
                value={form.fullName}
                onChange={set("fullName")}
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div className="mb-4" ref={emailRef}>
              <label className="form-label">
                Email <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">Undangan kalender akan dikirim ke email ini.</p>
              <input
                type="email"
                className="form-input"
                placeholder="email@contoh.com"
                value={form.email}
                onChange={set("email")}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="mb-0" ref={whatsappRef}>
              <label className="form-label">
                No. WhatsApp <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">Nomor aktif untuk konfirmasi booking dari admin.</p>
              <input
                type="tel"
                className="form-input"
                placeholder="08xxxxxxxxxx"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Section 2: Jadwal */}
          <div className="form-section" ref={section2Ref}>
            <p className="form-section-title"><span className="form-section-badge">2</span>Jadwal</p>

            <div className="mb-4" ref={bookingDateRef}>
              <label className="form-label">
                Tanggal Booking <span className="required-mark">*</span>
              </label>
              <div className="mb-2 rounded-lg border border-gold-100 bg-gold-50/50 px-3 py-2.5 text-xs">
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-stone-500">
                  <span>Jam Operasional</span>
                  <span className="text-right font-medium text-stone-700">09.00 – 21.00 WIB</span>
                  <span>Durasi Sesi</span>
                  <span className="text-right font-medium text-stone-700">4 jam</span>
                </div>
                <p className="mt-2 mb-1 font-semibold uppercase tracking-wide text-[10px] text-gold-600">Tarif Sewa Studio</p>
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-stone-500">
                  <span>Per sesi (4 jam)</span>
                  <span className="text-right font-medium text-stone-700">Rp 65.000</span>
                  <span>Full Day / 2 sesi (9 jam)</span>
                  <span className="text-right font-medium text-stone-700">Rp 130.000</span>
                  <span>Tambahan durasi (maks 2 jam)</span>
                  <span className="text-right font-medium text-stone-700">Rp 20.000/jam</span>
                </div>
              </div>
              <p className="mb-2 text-xs text-stone-400">
                Tanggal bertanda titik sudah ada booking, dan yang pudar berarti penuh/libur. Studio tutup setiap hari Jumat.
              </p>
              <BookingCalendar
                value={form.bookingDate}
                onChange={selectDate}
                bookedDates={bookedDates}
                loadingBookedDates={loadingBookedDates}
                disabled={loading}
              />
            </div>

            <div className="mb-0" ref={bookingTimeRef}>
              <label className="form-label">
                Sesi Booking <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                {form.bookingDate ? "Pilih sesi yang masih tersedia untuk tanggal yang dipilih." : "Pilih tanggal terlebih dahulu."}
              </p>
              <div className="space-y-2">
                {SESSION_OPTIONS.map((opt) => {
                  const counts = bookedDates[form.bookingDate] || { pagi: 0, sore: 0, full: 0 };
                  const full = isSessionFull(opt.key, counts);
                  return (
                    <RadioOption
                      key={opt.key}
                      name="bookingTime"
                      label={`${opt.label}${full ? " (penuh)" : ""}`}
                      checked={form.bookingTime === opt.value}
                      onChange={() => {
                        setForm((prev) => ({ ...prev, bookingTime: opt.value }));
                        setError("");
                      }}
                      disabled={loading || !form.bookingDate || full}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Detail Sesi */}
          <div className="form-section" ref={section3Ref}>
            <p className="form-section-title"><span className="form-section-badge">3</span>Detail Sesi</p>

            <div className="mb-4" ref={accessoriesRef}>
              <label className="form-label">
                Add On Aksesoris <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Stok aksesoris terbatas, ketersediaannya akan dikonfirmasi oleh admin setelah formulir ini dikirim ya kak. 🙏
              </p>
              <div className="space-y-2">
                {ACCESSORY_OPTIONS.map((opt) => {
                  const { name, price } = splitPrice(opt);
                  return (
                    <CheckboxOption
                      key={opt}
                      label={name}
                      price={price}
                      checked={selectedAccessories.includes(opt)}
                      onChange={() => toggleAccessory(opt)}
                      disabled={loading}
                    />
                  );
                })}
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                showAdatDetail ? "mb-4 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden" ref={adatDetailRef}>
                <label className="form-label">
                  Detail Aksesoris Adat <span className="required-mark">*</span>
                </label>
                <p className="mb-2 text-xs text-stone-400">
                  Silakan pilih detail aksesoris yang diinginkan. Admin akan mengonfirmasi ketersediaan stok setelah formulir ini dikirim ya kak. 🙏
                </p>
                <div className="space-y-2">
                  {ADAT_DETAIL_OPTIONS.map((opt) => {
                    const { name, price: color } = splitPrice(opt);
                    return (
                      <RadioOption
                        key={opt}
                        name="adatDetail"
                        label={name}
                        color={color}
                        checked={adatDetail === opt}
                        onChange={() => {
                          setAdatDetail(opt);
                          setError("");
                        }}
                        disabled={loading || !showAdatDetail}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-4" ref={attireRef}>
              <label className="form-label">
                Pilihan Attire <span className="required-mark">*</span>
              </label>
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="rounded-full bg-gold-50 px-2 py-0.5 font-medium text-gold-700 ring-1 ring-gold-200">Ukuran S–L</span>
                <span className="text-stone-400">Di luar rentang ini, gunakan busana pribadi atau hubungi kami dahulu.</span>
              </div>
              <div className="space-y-2">
                {ATTIRE_OPTIONS.map((opt) => {
                  const { name, price } = splitPrice(opt);
                  return (
                    <RadioOption
                      key={opt}
                      name="attire"
                      label={name}
                      price={price}
                      checked={form.attire === opt}
                      onChange={() => {
                        setForm((prev) => ({ ...prev, attire: opt }));
                        setError("");
                      }}
                      disabled={loading}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-4" ref={pendampingRef}>
              <label className="form-label">
                Apakah Membawa Pendamping? <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Agar sesi rias lebih nyaman dan kondusif, kami menyarankan untuk tidak membawa anak kecil ke studio ya kak. 🙏
              </p>
              <YesNoToggle
                value={form.pendamping}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, pendamping: v }));
                  setError("");
                }}
                disabled={loading}
              />
            </div>

            <div className="mb-0" ref={fotograferRef}>
              <label className="form-label">
                Apakah Ingin Tambahan Fotografer? <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Biaya tambahan untuk Fotografer - Rp 25.000 / 25 foto. Fotografer hanya tersedia di hari Sabtu dan Minggu, sesuai jadwal dari fotografer tersebut. Pastikan konfirmasi ke Admin untuk jadwal Fotografer.
              </p>
              <YesNoToggle
                value={form.fotografer}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, fotografer: v }));
                  setError("");
                }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Section 4: Pembayaran */}
          <div className="form-section" ref={section4Ref}>
            <p className="form-section-title"><span className="form-section-badge">4</span>Pembayaran <span className="required-mark">*</span></p>

            <p className="mb-3 text-xs text-stone-500">
              Untuk mengamankan jadwal booking, mohon melakukan <strong className="font-semibold text-stone-700">DP sebesar Rp 35.000</strong> ke melalui QRIS di bawah atau rekening berikut:
            </p>

            <div className="mb-4 rounded-xl border border-gold-100 bg-gold-50/50 p-4 text-center">
              <Image
                src="/qris-megumi.jpg"
                alt="QRIS Megumi Beauty Studio"
                width={908}
                height={1280}
                className="mx-auto h-auto w-full max-w-xs rounded-lg shadow-md ring-1 ring-gold-200"
              />
              <p className="mt-3 text-xs font-medium text-gold-700">Megumi Beauty Studio</p>
            </div>

            <div className="mb-4 rounded-xl border border-gold-100 bg-white p-4 text-sm">
              <p className="font-semibold text-stone-700">Blu (BCA Digital)</p>
              <p className="mt-1 text-stone-500">
                No. Rekening: <span className="font-semibold text-stone-700">001765236252</span>
              </p>
              <p className="text-stone-500">
                Atas Nama: <span className="font-semibold text-stone-700">Putri Melati R</span>
              </p>
            </div>

            <div className="mt-4" ref={paymentProofRef}>
              <label className="form-label">
                Bukti Pembayaran <span className="required-mark">*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Setelah melakukan pembayaran, silakan unggah foto atau screenshot bukti transfer pada kolom di bawah ini ya kak. Terima kasih 🙏
              </p>

              <input
                type="file"
                id="payment-proof-camera"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleProofChange}
                disabled={loading || compressingProof}
                className="hidden"
              />
              <input
                type="file"
                id="payment-proof-gallery"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProofChange}
                disabled={loading || compressingProof}
                className="hidden"
              />

              {compressingProof ? (
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold-200 bg-white py-5 text-center">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-300 border-t-gold-600" />
                  <span className="mt-1 text-xs font-medium text-gold-700">Mengompres foto...</span>
                </div>
              ) : paymentProofPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-gold-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentProofPreview}
                    alt="Preview bukti pembayaran"
                    onClick={() => setShowProofLightbox(true)}
                    className="h-16 w-16 cursor-zoom-in rounded-lg object-cover ring-1 ring-gold-100"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-stone-700">{paymentProof?.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {paymentProof ? `${(paymentProof.size / 1024 / 1024).toFixed(1)} MB` : ""}
                      {" · "}
                      <button
                        type="button"
                        onClick={() => setShowProofLightbox(true)}
                        className="underline underline-offset-2 hover:text-gold-700"
                      >
                        Lihat
                      </button>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeProof}
                    disabled={loading}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label
                    htmlFor="payment-proof-camera"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold-200 bg-white py-5 text-center transition hover:border-gold-400 hover:bg-gold-50/40"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium text-gold-700">Ambil Foto</span>
                  </label>
                  <label
                    htmlFor="payment-proof-gallery"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold-200 bg-white py-5 text-center transition hover:border-gold-400 hover:bg-gold-50/40"
                  >
                    <span className="text-2xl">🖼️</span>
                    <span className="text-xs font-medium text-gold-700">Pilih dari Galeri</span>
                  </label>
                  <p className="col-span-2 text-center text-[11px] text-stone-400">JPG, PNG, atau WEBP — foto akan otomatis dikompres</p>
                </div>
              )}
            </div>
          </div>

          {/* Konfirmasi Akhir */}
          <div className="mb-4 rounded-xl border border-gold-100 bg-white p-4" ref={termsRef}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
              Konfirmasi Akhir <span className="required-mark">*</span>
            </p>
            <p className="mb-3 text-sm text-stone-600">
              Sebelum melanjutkan, mohon baca{" "}
              <a
                href="https://drive.google.com/file/d/1LPBRBp5TovS_6qo4cCuYVdVUvAbCFuuZ/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold-700 underline underline-offset-2 hover:text-gold-800"
              >
                Ketentuan Reservasi dan Kebijakan Pembatalan
              </a>{" "}
              kami.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gold-100 bg-gold-50/40 px-3 py-2.5 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setError("");
                }}
                disabled={loading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gold-300 text-gold-600 focus:ring-gold-400"
              />
              <span>Saya telah membaca dan menyetujui Ketentuan Reservasi serta Kebijakan Pembatalan di atas.</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-primary" disabled={loading || compressingProof}>
            {loading ? "Mengirim..." : compressingProof ? "Memproses foto..." : "Kirim Booking"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-400">
          Booking akan dikonfirmasi via WhatsApp. Silakan tunggu konfirmasi dari kami.
        </p>
      </div>

      {/* Lightbox: perbesar bukti pembayaran */}
      {showProofLightbox && paymentProofPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowProofLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={paymentProofPreview}
            alt="Bukti pembayaran (perbesar)"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setShowProofLightbox(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-stone-700 shadow-md"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
