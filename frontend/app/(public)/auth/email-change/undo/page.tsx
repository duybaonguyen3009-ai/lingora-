/**
 * /auth/email-change/undo — server-rendered shell.
 *
 * Wraps the client body in <Suspense> so Next.js 14's static
 * prerender doesn't bail out on useSearchParams(). See
 * https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
 */

import { Suspense } from "react";
import UndoClient from "./UndoClient";

function Fallback() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center px-6"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Đang xử lý...
      </p>
    </div>
  );
}

export default function EmailChangeUndoPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <UndoClient />
    </Suspense>
  );
}
