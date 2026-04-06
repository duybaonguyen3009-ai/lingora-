/**
 * Frontend smoke test.
 *
 * Verifies that the root layout component module can be imported
 * and exports a default function. No DOM rendering — just a
 * module-level sanity check.
 */

import { describe, it, expect } from "vitest";

describe("App root", () => {
  it("RootLayout should export a default function", async () => {
    const mod = await import("@/app/layout");
    expect(typeof mod.default).toBe("function");
  });
});
