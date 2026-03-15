/**
 * instrumentation.ts
 *
 * Next.js 14 App Router instrumentation hook.
 * Called once on server startup and once for the Edge runtime.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We use it to initialise Sentry for the appropriate runtime so that
 * errors thrown during SSR/RSC rendering are captured.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
