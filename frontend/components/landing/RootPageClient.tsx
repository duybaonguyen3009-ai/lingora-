"use client";

/**
 * RootPageClient.tsx — Client-side logic for the root page.
 * Handles auth redirect while keeping page.tsx as a server component for SEO.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import LandingPage from "./LandingPage";

export default function RootPageClient() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [isLoading, user, router]);

  if (user) return null;

  return <LandingPage />;
}
