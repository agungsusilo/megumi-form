import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking Studio – Megumi Beauty Studio",
  description: "Form pemesanan sesi foto di Megumi Beauty Studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
