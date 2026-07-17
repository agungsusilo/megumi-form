"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

const TODAY = new Date().toISOString().split("T")[0];

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  bookingDate: string;
  bookingTime: string;
  accessories: string;
  accessoryDetails: string;
  attire: string;
  pendamping: string;
  fotografer: string;
};

const INITIAL: FormState = {
  fullName: "", email: "", whatsapp: "", bookingDate: "", bookingTime: "",
  accessories: "", accessoryDetails: "", attire: "", pendamping: "", fotografer: "",
};

export function BookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.fullName.trim()) return setError("Nama lengkap wajib diisi.");
    if (!form.email.trim()) return setError("Email wajib diisi.");
    if (!form.whatsapp.trim()) return setError("No. WhatsApp wajib diisi.");
    if (!form.bookingDate) return setError("Tanggal booking wajib dipilih.");
    if (!form.bookingTime) return setError("Jam booking wajib dipilih.");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim booking.");

      const params = new URLSearchParams({
        nama: form.fullName,
        tanggal: form.bookingDate,
        jam: form.bookingTime,
      });
      router.push(`/sukses?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🌸</div>
          <h1 className="text-2xl font-bold text-pink-700">Megumi Beauty Studio</h1>
          <p className="mt-1 text-sm text-gray-500">Form Booking Sesi Foto</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-pink-100">

          {/* Section 1: Data Diri */}
          <div className="form-section">
            <p className="form-section-title">Data Diri</p>

            <div className="mb-4">
              <label className="form-label">
                Nama Lengkap <span>*</span>
              </label>
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
              <input
                type="email"
                className="form-input"
                placeholder="email@contoh.com"
                value={form.email}
                onChange={set("email")}
                disabled={loading}
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-gray-400">Undangan kalender akan dikirim ke email ini.</p>
            </div>

            <div className="mb-0">
              <label className="form-label">
                No. WhatsApp <span>*</span>
              </label>
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
            <p className="form-section-title">Jadwal</p>

            <div className="mb-4">
              <label className="form-label">
                Tanggal Booking <span>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={TODAY}
                value={form.bookingDate}
                onChange={set("bookingDate")}
                disabled={loading}
              />
            </div>

            <div className="mb-0">
              <label className="form-label">
                Jam Booking <span>*</span>
              </label>
              <select
                className="form-input"
                value={form.bookingTime}
                onChange={set("bookingTime")}
                disabled={loading}
              >
                <option value="">-- Pilih jam --</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t} WIB</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Detail (opsional) */}
          <div className="form-section">
            <p className="form-section-title">Detail Sesi <span className="normal-case font-normal text-gray-400">(opsional)</span></p>

            <div className="mb-4">
              <label className="form-label">Aksesoris / Paket</label>
              <input
                type="text"
                className="form-input"
                placeholder="Misal: Sewa Properti, Sewa Baju, dll."
                value={form.accessories}
                onChange={set("accessories")}
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Detail Aksesoris</label>
              <textarea
                className="form-input resize-none"
                rows={3}
                placeholder="Keterangan tambahan tentang aksesori..."
                value={form.accessoryDetails}
                onChange={set("accessoryDetails")}
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Pilihan Attire / Baju</label>
              <input
                type="text"
                className="form-input"
                placeholder="Misal: Kebaya, Gaun, Kasual, dll."
                value={form.attire}
                onChange={set("attire")}
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Pendamping</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama pendamping (jika ada)"
                value={form.pendamping}
                onChange={set("pendamping")}
                disabled={loading}
              />
            </div>

            <div className="mb-0">
              <label className="form-label">Fotografer</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama fotografer (jika sudah ada)"
                value={form.fotografer}
                onChange={set("fotografer")}
                disabled={loading}
              />
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

        <p className="mt-6 text-center text-xs text-gray-400">
          Booking akan dikonfirmasi via WhatsApp. Silakan tunggu konfirmasi dari kami.
        </p>
      </div>
    </main>
  );
}
