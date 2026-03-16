"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("lingona-splash-shown")) return;
    setShow(true);
    sessionStorage.setItem("lingona-splash-shown", "1");

    const fadeTimer = setTimeout(() => setFadeOut(true), 500);
    const hideTimer = setTimeout(() => setShow(false), 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3"
      style={{
        backgroundColor: "var(--color-bg)",
        animation: fadeOut ? "splashFadeOut 0.3s ease forwards" : undefined,
      }}
    >
      <img
        src="/lingora-logo.png"
        alt="Lingona mascot"
        className="w-20 h-20 object-contain"
        style={{ animation: "splashFadeIn 0.3s ease both" }}
      />
      <span
        className="font-sora font-bold text-xl tracking-wide"
        style={{
          color: "var(--color-primary)",
          animation: "splashFadeIn 0.3s ease 0.15s both",
        }}
      >
        LINGONA
      </span>
    </div>
  );
}
