import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/app/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ZugZug",
    template: "%s | ZugZug",
  },
  description:
    "ZugZug — the all-in-one guild dashboard for World of Warcraft. Manage your roster, schedule raids, track logs, and monitor Mythic+ progress.",
  keywords: [
    "World of Warcraft",
    "WoW guild",
    "guild dashboard",
    "raid manager",
    "roster tracker",
    "Mythic+",
    "Warcraft Logs",
    "ZugZug",
  ],
  openGraph: {
    title: "ZugZug",
    description:
      "The all-in-one guild dashboard for World of Warcraft. Roster, raids, logs, Mythic+ and more.",
    siteName: "ZugZug",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ZugZug" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZugZug",
    description:
      "The all-in-one guild dashboard for World of Warcraft. Roster, raids, logs, Mythic+ and more.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
