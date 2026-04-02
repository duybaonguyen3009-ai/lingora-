import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "Lingona",
  description: "Lingona — AI-powered English speaking coach",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/lingora-logo.png", type: "image/png" },
    ],
    apple: "/lingora-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
