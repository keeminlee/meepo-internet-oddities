import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meepo Internet Oddities",
  description: "A collection of weird and wonderful internet oddities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
