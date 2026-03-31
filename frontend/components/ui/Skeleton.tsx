"use client";

import React from "react";

/* Skeleton — Lingona Design System
   Animated placeholder for loading states.

   Usage:
     <Skeleton width={200} height={20} />
     <Skeleton width="100%" height={16} rounded="full" />
     <Skeleton.Card />  // pre-built card skeleton
*/

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const roundedMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const Skeleton: React.FC<SkeletonProps> & { Card: React.FC<{ className?: string }> } = ({
  width = "100%",
  height = 16,
  rounded = "md",
  className = "",
}) => (
  <div
    className={`animate-pulse ${roundedMap[rounded]} ${className}`}
    style={{
      width,
      height,
      background: "var(--color-border)",
    }}
  />
);

// Pre-built card skeleton (common pattern)
Skeleton.Card = function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-lg p-4 flex flex-col gap-3 ${className}`}
      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
    </div>
  );
};

export default Skeleton;
