// Full day is hardcoded 09:00-18:00 in the studio's Apps Script (processBookingRow),
// separate from the "sore" session which runs until 19:00 — mirrored here as-is.
export const SESSION_OPTIONS = [
  { key: "pagi", label: "Sesi Pagi (09.00 - 13.00)", value: "Sesi pagi dari jam 09.00 - 13.00 (4 Jam)", startHour: 9, endHour: 13 },
  { key: "sore", label: "Sesi Sore (15.00 - 19.00)", value: "Sesi sore dari jam 15.00 - 19.00 (4 Jam)", startHour: 15, endHour: 19 },
  { key: "full", label: "Full Day (2 Sesi)", value: "Full Day (2 Sesi)", startHour: 9, endHour: 18 },
] as const;

export type SessionKey = (typeof SESSION_OPTIONS)[number]["key"];

// Matches the studio's Apps Script (processBookingRow): up to 3 concurrent
// bookings are allowed per overlapping time window before it's marked FULL.
export const SESSION_CAPACITY = 3;

// Historical rows use inconsistent phrasing for the same session
// ("09.00 - 13.00" vs "Sesi pagi dari jam 09.00 - 13.00 (4 Jam)"), so match by substring —
// same approach the Apps Script uses (indexOf("full"), then extracting HH.MM pairs).
export function classifySession(raw: string): SessionKey | null {
  const s = (raw || "").toLowerCase();
  if (s.includes("full")) return "full";
  if (s.includes("09.00") || s.includes("09:00") || s.includes("pagi")) return "pagi";
  if (s.includes("15.00") || s.includes("15:00") || s.includes("sore")) return "sore";
  return null;
}

export type SessionCounts = { pagi: number; sore: number; full: number };

export function isSessionFull(key: SessionKey, counts: SessionCounts): boolean {
  return counts[key] >= SESSION_CAPACITY;
}

export function isDayFull(counts: SessionCounts): boolean {
  return counts.pagi >= SESSION_CAPACITY && counts.sore >= SESSION_CAPACITY;
}

// Studio tutup setiap hari Jumat.
export const CLOSED_WEEKDAY = 5;

export function isClosedDate(iso: string): boolean {
  if (!iso) return false;
  return new Date(`${iso}T00:00:00`).getDay() === CLOSED_WEEKDAY;
}

export const ADAT_ACCESSORY_OPTION = "Aksesoris Adat - Rp 25.000";

export const ACCESSORY_OPTIONS = [
  "Aksesoris Mahkota Kecil - Free",
  "Aksesoris Mahkota Besar -  Rp 15.000",
  "Melati Premium - Rp 20.000",
  "Aksesoris Bando Melayu - Rp 10.000",
  ADAT_ACCESSORY_OPTION,
] as const;

export const ADAT_DETAIL_OPTIONS = [
  "Adat Batak (Sortali) - Merah",
  "Adat Betawi - Gold",
  "Adat Betawi - Silver",
  "Adat Sunda (Siger) - Rose Gold",
  "Adat Sunda (Siger) - Gold",
  "Adat Sunda (Siger) - Silver",
  "Adat Jawa (Solo) - Gold",
  "Adat Padang (Sunting Minang) - Gold",
  "Adat Palembang - Gold",
  "Aksesoris India - Silver",
] as const;

export const ATTIRE_OPTIONS = [
  "Dress Pendek & Baju Tanpa Payet - Free",
  "Kebaya Panjang / Kebaya Full Payet / Dress Panjang - Rp 20.000",
  "Kebaya Premium / Gaun - Rp 50.000",
] as const;

export const YES_NO_OPTIONS = ["Ya", "Tidak"] as const;
