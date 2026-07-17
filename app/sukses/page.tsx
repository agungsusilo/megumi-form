import Link from "next/link";
import Image from "next/image";

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function SuksesPage({
  searchParams,
}: {
  searchParams: { nama?: string; tanggal?: string; sesi?: string };
}) {
  const nama = searchParams.nama || "";
  const tanggal = searchParams.tanggal || "";
  const sesi = searchParams.sesi || "";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md w-full text-center">

        <Image
          src="/megumi-logo.png"
          alt="Megumi Beauty Studio"
          width={472}
          height={188}
          className="animate-fade-up mx-auto h-auto w-52 object-contain"
        />
        <div className="animate-fade-up mx-auto mt-3 mb-5 h-px w-16 bg-gradient-to-r from-transparent via-gold-400 to-transparent [animation-delay:80ms]" />

        <div className="relative mb-4 flex justify-center">
          <span className="animate-ripple absolute h-14 w-14 rounded-full bg-gold-200" />
          <span className="animate-pop-in relative flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-2xl ring-1 ring-gold-200 [animation-delay:150ms]">✓</span>
        </div>

        <h1 className="animate-fade-up mb-2 font-serif text-3xl italic text-gold-800 [animation-delay:250ms]">Booking Terkirim!</h1>
        <p className="animate-fade-up mb-8 text-sm text-stone-500 [animation-delay:320ms]">
          Terima kasih{nama ? `, ${nama}` : ""}! Booking kamu sudah kami terima.
        </p>

        <div className="animate-fade-up rounded-2xl border border-gold-100 bg-white/90 p-6 shadow-xl shadow-gold-900/5 text-left mb-6 [animation-delay:400ms]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">Ringkasan Booking</p>

          {nama && (
            <div className="mb-3 flex items-start gap-3">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-xs text-stone-400">Nama</p>
                <p className="text-sm font-medium text-stone-800">{nama}</p>
              </div>
            </div>
          )}

          {tanggal && (
            <div className="mb-3 flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs text-stone-400">Tanggal</p>
                <p className="text-sm font-medium text-stone-800">{formatDate(tanggal)}</p>
              </div>
            </div>
          )}

          {sesi && (
            <div className="flex items-start gap-3">
              <span className="text-lg">🕐</span>
              <div>
                <p className="text-xs text-stone-400">Sesi</p>
                <p className="text-sm font-medium text-stone-800">{sesi}</p>
              </div>
            </div>
          )}
        </div>

        <div className="animate-fade-up rounded-2xl bg-gold-50 p-5 text-left mb-8 ring-1 ring-gold-200 [animation-delay:480ms]">
          <p className="text-sm font-medium text-gold-800 mb-1">📱 Menunggu konfirmasi admin</p>
          <p className="text-xs text-stone-600">
            Booking kamu sedang kami proses. Konfirmasi akan dikirim via <strong>WhatsApp</strong> dalam waktu 1×24 jam.
            Setelah dikonfirmasi, undangan Google Calendar akan dikirim ke email yang kamu daftarkan.
          </p>
        </div>

        <Link
          href="/"
          className="animate-fade-up inline-block rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-md shadow-gold-900/10 transition hover:from-gold-700 hover:to-gold-600 [animation-delay:560ms]"
        >
          Buat Booking Baru
        </Link>
      </div>
    </main>
  );
}
