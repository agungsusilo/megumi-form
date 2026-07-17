"use client";

import { useMemo, useState } from "react";
import { isDayFull, isClosedDate, type SessionCounts } from "@/lib/constants";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const EMPTY_COUNTS: SessionCounts = { pagi: 0, sore: 0, full: 0 };

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  bookedDates: Record<string, SessionCounts>;
  loadingBookedDates?: boolean;
  disabled?: boolean;
};

export function BookingCalendar({ value, onChange, bookedDates, loadingBookedDates, disabled }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIso(today.getFullYear(), today.getMonth(), today.getDate()), [today]);
  const initial = value ? new Date(`${value}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  }

  return (
    <div className="rounded-xl border border-gold-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={!canGoPrev || disabled}
          className="rounded-md px-2 py-1 text-gold-600 transition hover:bg-gold-50 disabled:opacity-30"
          aria-label="Bulan sebelumnya"
        >
          &#8249;
        </button>
        <p className="text-sm font-semibold text-stone-700">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={disabled}
          className="rounded-md px-2 py-1 text-gold-600 transition hover:bg-gold-50 disabled:opacity-30"
          aria-label="Bulan berikutnya"
        >
          &#8250;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1 text-[11px] font-medium text-stone-400">{w}</div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const iso = toIso(viewYear, viewMonth, day);
          const isPast = iso < todayIso;
          const isClosed = isClosedDate(iso);
          const counts = bookedDates[iso] || EMPTY_COUNTS;
          const takenCount = counts.pagi + counts.sore;
          const isFull = isDayFull(counts);
          const isSelected = iso === value;
          const isToday = iso === todayIso;
          const isDisabled = isPast || isFull || isClosed || disabled;

          return (
            <button
              key={iso}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(iso)}
              title={isClosed ? "Studio libur (Jumat)" : isFull ? "Sudah penuh" : takenCount > 0 ? `${takenCount} booking pada tanggal ini` : undefined}
              className={[
                "relative flex h-10 flex-col items-center justify-center rounded-lg text-xs transition",
                isSelected
                  ? "bg-gradient-to-br from-gold-600 to-gold-500 font-semibold text-white shadow-sm"
                  : isClosed
                    ? "cursor-not-allowed text-stone-300"
                    : isDisabled
                      ? "cursor-not-allowed text-stone-300"
                      : "text-stone-700 hover:bg-gold-50",
                isToday && !isSelected ? "ring-1 ring-gold-300" : "",
              ].join(" ")}
            >
              {day}
              {isClosed && !isSelected ? (
                <span className="text-[8px] leading-none text-stone-300">Libur</span>
              ) : (
                takenCount > 0 && !isSelected && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isFull ? "bg-stone-300" : "bg-gold-400"}`} />
                )
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gold-100 pt-2 text-[11px] text-stone-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> Ada booking</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-stone-300" /> Penuh</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-stone-200" /> Libur (Jumat)</span>
      </div>
      {loadingBookedDates && (
        <p className="mt-2 text-center text-[11px] text-stone-400">Memuat ketersediaan...</p>
      )}
    </div>
  );
}
