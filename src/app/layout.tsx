import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shanuzz Media Tracker",
  description: "Track the Shanuzz digital media pipeline from shoot to upload.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MediaTracker",
  },
  icons: {
    icon: "/icons/favicon.svg",
    apple: "/icons/icon-512.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#005581",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg?v=2" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,510;14..32,590&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background dark:bg-gray-950">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
