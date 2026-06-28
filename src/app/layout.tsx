import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { DialogProvider } from "@/providers/dialog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KANs Flow",
  description: "Workspace operations platform for KANs HUB",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/app_logo.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: "/app_logo.png?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KANs Flow",
  },
  other: {
    "apple-touch-fullscreen": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
