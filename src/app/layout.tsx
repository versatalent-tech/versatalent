import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VersaTalent | Talent Agency",
  description:
    "VersaTalent is a premier talent agency representing exceptional talent across various industries including acting, modeling, music, culinary arts, and sports.",
  keywords:
    "talent agency, acting, modeling, music, culinary arts, sports, VersaTalent",
  icons: {
    icon: [
      { url: '/favicon.png' },
    ],
    apple: [
      { url: '/favicon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
