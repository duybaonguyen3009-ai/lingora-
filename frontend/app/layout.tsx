import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Lingora",
  description: "English learning app for kids",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
