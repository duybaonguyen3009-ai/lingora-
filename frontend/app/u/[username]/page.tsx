import type { Metadata } from "next";
import PublicProfileClient from "./PublicProfileClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — IELTS Journey`,
    description: `View ${username}'s IELTS learning journey on Lingona.`,
    openGraph: {
      title: `@${username} — IELTS Journey | Lingona`,
      description: `Join ${username} on Lingona and start your IELTS journey.`,
      url: `https://lingona.app/u/${username}`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  return <PublicProfileClient username={username} />;
}
