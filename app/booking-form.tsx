"use client";

import { useEffect, useState } from "react";
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

function RadioOption({ name, label, checked, onChange, disabled }: {
  name: string; label: string; checked: boolean; onChange: () => void; disabled?: boolean;
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
      <span className="text-stone-700">{label}</span>
    </label>
  );
}

function CheckboxOption({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: () => void; disabled?: boolean;
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
      <span className="text-stone-700">{label}</span>
    </label>
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

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format bukti pembayaran harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran bukti pembayaran maksimal 5MB.");
      return;
    }

    setError("");
    setPaymentProof(file);
    setPaymentProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function removeProof() {
    setPaymentProof(null);
    setPaymentProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.fullName.trim()) return setError("Nama lengkap wajib diisi.");
    if (!form.email.trim()) return setError("Email wajib diisi.");
    if (!form.whatsapp.trim()) return setError("No. WhatsApp wajib diisi.");
    if (!form.bookingDate) return setError("Tanggal booking wajib dipilih.");
    if (isClosedDate(form.bookingDate)) return setError("Studio libur pada hari Jumat. Silakan pilih tanggal lain.");
    if (!form.bookingTime) return setError("Jam booking wajib dipilih.");
    if (selectedAccessories.includes(ADAT_ACCESSORY_OPTION) && !adatDetail) {
      return setError("Silakan pilih detail aksesoris adat.");
    }
    if (!form.pendamping) return setError("Silakan pilih apakah membawa pendamping.");
    if (!paymentProof) return setError("Bukti pembayaran wajib diunggah.");

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      for (const [key, value] of Object.entries(form)) fd.append(key, value);
      fd.append("accessories", selectedAccessories.join(", "));
      fd.append("accessoryDetails", selectedAccessories.includes(ADAT_ACCESSORY_OPTION) ? adatDetail : "");
      fd.append("paymentProof", paymentProof);
      const res = await fetch("/api/booking", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim booking.");

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

        {/* Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gold-100 bg-white/90 p-6 shadow-xl shadow-gold-900/5 backdrop-blur-sm">

          {/* Section 1: Data Diri */}
          <div className="form-section">
            <p className="form-section-title"><span className="form-section-badge">1</span>Data Diri</p>

            <div className="mb-4">
              <label className="form-label">
                Nama Lengkap <span>*</span>
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

            <div className="mb-4">
              <label className="form-label">
                Email <span>*</span>
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

            <div className="mb-0">
              <label className="form-label">
                No. WhatsApp <span>*</span>
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
          <div className="form-section">
            <p className="form-section-title"><span className="form-section-badge">2</span>Jadwal</p>

            <div className="mb-4">
              <label className="form-label">
                Tanggal Booking <span>*</span>
              </label>
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

            <div className="mb-0">
              <label className="form-label">
                Sesi Booking <span>*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">Pilih sesi yang masih tersedia untuk tanggal yang dipilih.</p>
              <select
                className="form-input"
                value={form.bookingTime}
                onChange={set("bookingTime")}
                disabled={loading || !form.bookingDate}
              >
                <option value="">{form.bookingDate ? "-- Pilih sesi --" : "Pilih tanggal terlebih dahulu"}</option>
                {SESSION_OPTIONS.map((opt) => {
                  const counts = bookedDates[form.bookingDate] || { pagi: 0, sore: 0, full: 0 };
                  const full = isSessionFull(opt.key, counts);
                  return (
                    <option key={opt.key} value={opt.value} disabled={full}>
                      {opt.label}{full ? " (penuh)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Section 3: Detail Sesi */}
          <div className="form-section">
            <p className="form-section-title"><span className="form-section-badge">3</span>Detail Sesi</p>

            <div className="mb-4">
              <label className="form-label">
                Add On Aksesoris <span className="normal-case font-normal tracking-normal text-stone-400">(opsional)</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Stok aksesoris terbatas, ketersediaannya akan dikonfirmasi oleh admin setelah formulir ini dikirim ya kak. 🙏
              </p>
              <div className="space-y-2">
                {ACCESSORY_OPTIONS.map((opt) => (
                  <CheckboxOption
                    key={opt}
                    label={opt}
                    checked={selectedAccessories.includes(opt)}
                    onChange={() => toggleAccessory(opt)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {selectedAccessories.includes(ADAT_ACCESSORY_OPTION) && (
              <div className="mb-4">
                <label className="form-label">
                  Detail Aksesoris Adat <span>*</span>
                </label>
                <p className="mb-2 text-xs text-stone-400">
                  Silakan pilih detail aksesoris yang diinginkan. Admin akan mengonfirmasi ketersediaan stok setelah formulir ini dikirim ya kak. 🙏
                </p>
                <div className="space-y-2">
                  {ADAT_DETAIL_OPTIONS.map((opt) => (
                    <RadioOption
                      key={opt}
                      name="adatDetail"
                      label={opt}
                      checked={adatDetail === opt}
                      onChange={() => {
                        setAdatDetail(opt);
                        setError("");
                      }}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="form-label">
                Pilihan Attire <span className="normal-case font-normal tracking-normal text-stone-400">(opsional)</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Ukuran attire yang tersedia: S–L. Mohon memilih model yang sesuai. Jika ukuran di luar S–L, silakan menggunakan baju pribadi atau konsultasikan terlebih dahulu dengan kami.
              </p>
              <div className="space-y-2">
                {ATTIRE_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt}
                    name="attire"
                    label={opt}
                    checked={form.attire === opt}
                    onChange={() => {
                      setForm((prev) => ({ ...prev, attire: opt }));
                      setError("");
                    }}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">
                Apakah Membawa Pendamping? <span>*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Agar sesi rias lebih nyaman dan kondusif, kami menyarankan untuk tidak membawa anak kecil ke studio ya kak. 🙏
              </p>
              <div className="flex gap-2">
                {YES_NO_OPTIONS.map((opt) => (
                  <div key={opt} className="flex-1">
                    <RadioOption
                      name="pendamping"
                      label={opt}
                      checked={form.pendamping === opt}
                      onChange={() => {
                        setForm((prev) => ({ ...prev, pendamping: opt }));
                        setError("");
                      }}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-0">
              <label className="form-label">
                Apakah Ingin Tambahan Fotografer? <span className="normal-case font-normal tracking-normal text-stone-400">(opsional)</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Biaya tambahan untuk Fotografer - Rp 25.000 / 25 foto. Fotografer hanya tersedia di hari Sabtu dan Minggu, sesuai jadwal dari fotografer tersebut. Pastikan konfirmasi ke Admin untuk jadwal Fotografer.
              </p>
              <div className="flex gap-2">
                {YES_NO_OPTIONS.map((opt) => (
                  <div key={opt} className="flex-1">
                    <RadioOption
                      name="fotografer"
                      label={opt}
                      checked={form.fotografer === opt}
                      onChange={() => {
                        setForm((prev) => ({ ...prev, fotografer: opt }));
                        setError("");
                      }}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Pembayaran */}
          <div className="form-section">
            <p className="form-section-title"><span className="form-section-badge">4</span>Pembayaran <span>*</span></p>

            <p className="mb-3 text-xs text-stone-500">
              Untuk mengamankan jadwal booking, mohon melakukan <strong className="font-semibold text-stone-700">DP sebesar Rp 35.000</strong> ke melalui QRIS di bawah atau rekening berikut:
            </p>

            <div className="mb-4 rounded-xl border border-gold-100 bg-gold-50/50 p-4 text-center">
              <Image
                src="/qris-megumi.jpg"
                alt="QRIS Megumi Beauty Studio"
                width={908}
                height={1280}
                className="mx-auto w-48 rounded-lg shadow-md ring-1 ring-gold-200"
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

            <div className="mt-4">
              <label className="form-label">
                Bukti Pembayaran <span>*</span>
              </label>
              <p className="mb-2 text-xs text-stone-400">
                Setelah melakukan pembayaran, silakan unggah foto atau screenshot bukti transfer pada kolom di bawah ini ya kak. Terima kasih 🙏
              </p>

              <input
                type="file"
                id="payment-proof-input"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleProofChange}
                disabled={loading}
                className="hidden"
              />

              {paymentProofPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-gold-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentProofPreview}
                    alt="Preview bukti pembayaran"
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-gold-100"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-stone-700">{paymentProof?.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {paymentProof ? `${(paymentProof.size / 1024 / 1024).toFixed(1)} MB` : ""}
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
                <label
                  htmlFor="payment-proof-input"
                  className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold-200 bg-white py-5 text-center transition hover:border-gold-400 hover:bg-gold-50/40"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-xs font-medium text-gold-700">Ambil Foto / Upload Bukti</span>
                  <span className="text-[11px] text-stone-400">JPG, PNG, atau WEBP, maks. 5MB</span>
                </label>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Mengirim..." : "Kirim Booking"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-400">
          Booking akan dikonfirmasi via WhatsApp. Silakan tunggu konfirmasi dari kami.
        </p>
      </div>
    </main>
  );
}
