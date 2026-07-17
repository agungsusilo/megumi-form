import { google } from "googleapis";

function getConfig() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!clientEmail || !rawKey || !calendarId) return null;
  const privateKey = rawKey
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n");
  return { clientEmail, privateKey, calendarId };
}

export async function createBookingCalendarEvent(params: {
  fullName: string;
  email: string;
  whatsapp: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // HH:mm
  accessories?: string;
  accessoryDetails?: string;
  attire?: string;
}) {
  const config = getConfig();
  if (!config) {
    return { ok: false, skipped: true, reason: "Konfigurasi Google Calendar tidak lengkap." };
  }

  const { fullName, email, whatsapp, bookingDate, bookingTime, accessories, accessoryDetails, attire } = params;

  const start = new Date(`${bookingDate}T${bookingTime}:00+07:00`);
  if (isNaN(start.getTime())) {
    return { ok: false, skipped: true, reason: `Tanggal/jam tidak valid: "${bookingDate}" "${bookingTime}".` };
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 3);

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const descLines = [
    `Nama: ${fullName}`,
    `WhatsApp: ${whatsapp}`,
    `Email: ${email}`,
    accessories ? `Aksesoris: ${accessories}` : "",
    accessoryDetails ? `Detail: ${accessoryDetails}` : "",
    attire ? `Attire: ${attire}` : "",
  ].filter(Boolean);

  const response = await calendar.events.insert({
    calendarId: config.calendarId,
    sendUpdates: "all",
    requestBody: {
      summary: `Booking Studio - ${fullName}`,
      location: "Megumi Beauty Studio",
      description: descLines.join("\n"),
      start: { dateTime: start.toISOString(), timeZone: "Asia/Jakarta" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Jakarta" },
      attendees: [{ email }],
    },
  });

  return { ok: true, skipped: false, eventId: response.data.id || "" };
}
