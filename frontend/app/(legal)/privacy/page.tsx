import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: "Chính sách bảo mật của Lingona — ứng dụng luyện IELTS AI.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-400">
            Effective date: April 9, 2026
          </p>
        </header>

        <p>
          This Privacy Policy describes how <strong className="text-white">Lingona</strong> and
          the <strong className="text-white">Lingona-Bot</strong> Facebook application
          (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collect, use, and protect your
          information when you use our services.
        </p>

        <Section title="1. What Data We Collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>Email address (when you sign up or contact us)</li>
            <li>Usage data (pages visited, features used, interaction timestamps)</li>
            <li>Facebook profile information provided through Facebook Login (name, profile picture, page permissions)</li>
            <li>Content you create or submit through our platform</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul className="list-disc space-y-1 pl-5">
            <li>Personalize your language-learning experience</li>
            <li>Provide AI-powered feedback and recommendations</li>
            <li>Improve our services and develop new features</li>
            <li>Communicate important updates about our platform</li>
          </ul>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We integrate with the following third-party services:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-white">Facebook / Meta API</strong> — to manage page
              content and interact with users through Lingona-Bot
            </li>
            <li>
              <strong className="text-white">OpenAI API</strong> — to power AI-driven language
              feedback and content generation
            </li>
          </ul>
          <p className="mt-2">
            These services have their own privacy policies. We encourage you to review them.
          </p>
        </Section>

        <Section title="4. Data Retention &amp; Security">
          <p>
            We retain your data only as long as necessary to provide our services. We use
            industry-standard security measures to protect your information from unauthorized
            access, disclosure, or destruction.
          </p>
        </Section>

        <Section title="5. Your Rights">
          <p>
            You may request access to, correction of, or deletion of your personal data at any
            time. See our{" "}
            <a href="/data-deletion" className="text-blue-400 underline hover:text-blue-300">
              Data Deletion Instructions
            </a>{" "}
            page for details.
          </p>
        </Section>

        <Section title="6. Contact Us">
          <p>
            If you have questions about this Privacy Policy, please contact us at:{" "}
            <a
              href="mailto:baolux0904@gmail.com"
              className="text-blue-400 underline hover:text-blue-300"
            >
              baolux0904@gmail.com
            </a>
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}
