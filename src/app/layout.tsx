import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REDACT | Offline Evidence & On-Chain Proof",
  description: "Secure, offline intelligence pipeline for human rights defenders. Process evidence in internet-blackout zones and anchor proof to Solana.",
  keywords: ["Human Rights", "Offline AI", "Solana", "Evidence", "Cryptography", "Redact", "QVAC"],
  authors: [{ name: "Redact Protocol" }],
  openGraph: {
    title: "REDACT | Offline Evidence & On-Chain Proof",
    description: "Secure, offline intelligence pipeline for human rights defenders.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full antialiased ${geistSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full flex flex-col bg-void selection:bg-highlight selection:text-void">
        {children}
      </body>
    </html>
  );
}
