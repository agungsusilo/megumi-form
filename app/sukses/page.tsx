import Link from "next/link";

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function SuksesPage({
  searchParams,
}: {
  searchParams: { nama?: string; tanggal?: string; jam?: string };
}) {
  const nama = searchParams.nama || "";
  const tanggal = searchParams.tanggal || "";
  const jam = searchParams.jam || "";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md w-full text-center">

        <div className="mb-6 text-6xl">🎉</div>

        <h1 className="mb-2 text-2xl font-bold text-pink-700">Booking Terkirim!</h1>
        <p className="mb-8 text-sm text-gray-500">
          Terima kasih{nama ? `, ${nama}` : ""}! Booking kamu sudah kami terima.
        </p>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-pink-100 text-left mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-pink-400">Ringkasan Booking</p>

          {nama && (
            <div className="mb-3 flex items-start gap-3">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-xs text-gray-400">Nama</p>
                <p className="text-sm font-medium text-gray-800">{nama}</p>
              </div>
            </div>
          )}

          {tanggal && (
            <div className="mb-3 flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs text-gray-400">Tanggal</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(tanggal)}</p>
              </div>
            </div>
          )}

          {jam && (
            <div className="flex items-start gap-3">
              <span className="text-lg">🕐</span>
              <div>
                <p className="text-xs text-gray-400">Jam</p>
                <p className="text-sm font-medium text-gray-800">{jam} WIB</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-pink-50 p-5 text-left mb-8 ring-1 ring-pink-200">
          <p className="text-sm font-medium text-pink-700 mb-1">📧 Cek email kamu</p>
          <p className="text-xs text-gray-600">
            Undangan Google Calendar telah dikirim ke email yang kamu daftarkan.
            Booking akan dikonfirmasi via <strong>WhatsApp</strong> dalam waktu 1×24 jam.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block rounded-xl bg-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-pink-600"
        >
          Buat Booking Baru
        </Link>
      </div>
    </main>
  );
}
