import type { Metadata } from "next";
import RootPageClient from "@/components/landing/RootPageClient";

export const metadata: Metadata = {
  title: "Luyện IELTS Speaking & Writing AI — Lingona",
  description:
    "Luyện thi IELTS online với AI thông minh. Chấm Speaking tức thì, Writing chi tiết theo chuẩn IELTS. Mục tiêu band 6.5, 7.0, 7.5+. Thử miễn phí ngay.",
  keywords: [
    "luyện IELTS", "IELTS speaking AI", "luyện thi IELTS online",
    "IELTS writing AI", "luyện speaking IELTS", "band 6.5", "học IELTS online",
  ],
  openGraph: {
    title: "Luyện IELTS Speaking & Writing AI — Lingona",
    description: "Luyện thi IELTS online với AI thông minh. Thử miễn phí ngay.",
    url: "https://lingona.app",
  },
};

export default function RootPage() {
  return <RootPageClient />;
}
