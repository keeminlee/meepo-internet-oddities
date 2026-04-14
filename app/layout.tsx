import type { Metadata } from "next";
import { Toaster } from "sonner";

import { BRAND } from "@/lib/constants";

import "./globals.css";

const TITLE = `${BRAND.name} — ${BRAND.subtitle}`;

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.url}`),
  title: { default: TITLE, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  openGraph: {
    title: TITLE,
    description: BRAND.description,
    url: `https://${BRAND.url}`,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: BRAND.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
