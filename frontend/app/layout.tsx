import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import SplashScreen from "@/components/SplashScreen";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lingona.app"),
  title: {
    default: "Lingona — Luyện IELTS Speaking & Writing AI",
    template: "%s | Lingona",
  },
  description:
    "Luyện thi IELTS online với AI. Chấm Speaking, Writing theo chuẩn IELTS. Luyện tập mọi lúc, mọi nơi. Mục tiêu band 6.5, 7.0, 7.5+.",
  keywords: [
    "luyện IELTS", "IELTS speaking AI", "luyện thi IELTS online",
    "IELTS writing AI", "luyện speaking IELTS", "band 6.5",
    "học IELTS online", "luyện thi IELTS", "IELTS Vietnam",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://lingona.app",
    siteName: "Lingona",
    title: "Lingona — Luyện IELTS Speaking & Writing AI",
    description: "Luyện thi IELTS online với AI. Chấm Speaking, Writing theo chuẩn IELTS. Mục tiêu band 6.5+.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Lingona — Luyện IELTS AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lingona — Luyện IELTS Speaking & Writing AI",
    description: "Luyện thi IELTS online với AI. Mục tiêu band 6.5+.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://lingona.app",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lingona",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/lingora-logo.png", type: "image/png" },
    ],
    apple: "/lingora-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F1E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${playfair.variable} ${dmSans.variable}`}
    >
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AuthProvider>
            <SplashScreen />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
