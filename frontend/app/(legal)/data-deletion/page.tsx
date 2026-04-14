import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xóa dữ liệu",
  description: "Hướng dẫn yêu cầu xóa dữ liệu cá nhân trên Lingona.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-dvh px-6 py-16">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white">Data Deletion Request</h1>
          <p className="mt-2 text-sm text-gray-400">
            Lingona &amp; Lingona-Bot
          </p>
        </header>

        <p className="leading-relaxed text-gray-300">
          We respect your right to control your personal data. If you would like to request
          deletion of all data associated with your account, please follow the instructions
          below.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">How to Request Data Deletion</h2>
          <div className="rounded-lg border border-gray-700 bg-[#111c32] p-6 leading-relaxed text-gray-300">
            <p>
              Send an email to{" "}
              <a
                href="mailto:baolux0904@gmail.com?subject=Data%20Deletion%20Request"
                className="text-blue-400 underline hover:text-blue-300"
              >
                baolux0904@gmail.com
              </a>{" "}
              with the subject line:{" "}
              <strong className="text-white">&quot;Data Deletion Request&quot;</strong>
            </p>
            <p className="mt-3">
              Please include the email address or Facebook account associated with your data so
              we can locate your records.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">What Happens Next</h2>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed text-gray-300">
            <li>We will acknowledge your request within 48 hours</li>
            <li>Your data will be permanently deleted within 30 days</li>
            <li>You will receive a confirmation email once deletion is complete</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Alternative Contact</h2>
          <p className="leading-relaxed text-gray-300">
            You can also reach us through our Facebook Page:{" "}
            <a
              href="https://facebook.com/lingona"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              facebook.com/lingona
            </a>
          </p>
        </section>
      </article>
    </div>
  );
}
