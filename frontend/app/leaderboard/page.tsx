import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Bảng xếp hạng IELTS",
  description: "Xem bảng xếp hạng học viên IELTS trên Lingona. Cạnh tranh và cải thiện band score mỗi tuần.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
