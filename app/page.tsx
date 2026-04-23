import Link from "next/link";
import { Suspense } from "react";
import { UnlockAccess } from "@/components/unlock-access";

const faqItems = [
  {
    question: "How is this different from regular drip emails?",
    answer:
      "Drip emails are time-based and ignore behavior. Course Completion Booster reacts to each student's momentum, inactivity gaps, and peer benchmarks so every nudge is context-aware."
  },
  {
    question: "Which platforms are supported?",
    answer:
      "The app accepts webhook events from Teachable and Thinkific today, and can ingest normalized progress events from any platform that can POST JSON."
  },
  {
    question: "Can I control tone and frequency?",
    answer:
      "Yes. Choose encouragement style, channel mix (email/SMS), and weekly nudge limits so outreach stays helpful instead of noisy."
  },
  {
    question: "What does setup look like?",
    answer:
      "Connect your checkout success redirect to include session_id, wire a Stripe webhook, and point your course platform webhooks to this app. Most creators finish setup in under 20 minutes."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-20 pt-8 md:px-10">
      <header className="rounded-2xl border border-slate-800/90 bg-[#111827]/70 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Course Completion Booster</p>
          <Link
            href="/dashboard"
            className="rounded-md border border-cyan-300/50 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-200 hover:text-cyan-100"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Increase online course completion rates with smart nudges
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
            Stop losing students after lesson three. Recover momentum with behavior-triggered coaching.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            Online course completion often sits between 5% and 15%. That means your students miss outcomes and your business loses lifetime value,
            referrals, and renewals. Course Completion Booster tracks progress patterns in real time and sends personalized encouragement exactly when
            each learner is most likely to re-engage.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              className="rounded-md bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Buy now for $15/month
            </a>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-500 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-300"
            >
              View product dashboard
            </Link>
          </div>
          <p className="text-sm text-slate-400">Hosted checkout through Stripe Payment Link. No custom checkout engineering needed.</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-[#0f172a]/80 p-6 shadow-xl shadow-cyan-900/20">
          <h2 className="text-xl font-semibold text-white">Why creators switch</h2>
          <ul className="mt-5 space-y-4 text-sm text-slate-300">
            <li className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="font-semibold text-cyan-200">Generic reminders underperform</p>
              <p className="mt-2">Static sequences miss context and trigger at the wrong time.</p>
            </li>
            <li className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="font-semibold text-cyan-200">Dropout risk is predictable</p>
              <p className="mt-2">Inactivity gaps, stalled progress, and low streaks signal risk before churn.</p>
            </li>
            <li className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="font-semibold text-cyan-200">Timely nudges recover revenue</p>
              <p className="mt-2">Reactivating even 10% of stalled students lifts completion and testimonial volume.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-slate-800 bg-[#111827]/60 p-8 md:grid-cols-3">
        <article className="space-y-3">
          <h3 className="text-lg font-semibold text-white">1. Track</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Ingest progress events from Teachable, Thinkific, or custom webhooks. Build a continuous timeline for every learner.
          </p>
        </article>
        <article className="space-y-3">
          <h3 className="text-lg font-semibold text-white">2. Diagnose</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Score dropout risk using momentum, lesson cadence, inactivity windows, and peer-relative progress.
          </p>
        </article>
        <article className="space-y-3">
          <h3 className="text-lg font-semibold text-white">3. Nudge</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Automatically send personalized encouragement via email or SMS with goal framing, social proof, and next-step clarity.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-cyan-700/30 bg-cyan-950/20 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-white">Simple pricing for serious retention</h3>
            <p className="text-slate-300">
              Built for course creators and education platforms that need better completion outcomes without a full growth team.
            </p>
          </div>
          <p className="text-4xl font-bold text-cyan-300">$15/mo</p>
        </div>
        <ul className="mt-6 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <li className="rounded-lg border border-cyan-800/40 bg-[#0d1117]/70 p-3">Unlimited progress webhook events</li>
          <li className="rounded-lg border border-cyan-800/40 bg-[#0d1117]/70 p-3">Personalized AI-assisted nudge suggestions</li>
          <li className="rounded-lg border border-cyan-800/40 bg-[#0d1117]/70 p-3">Engagement and completion analytics dashboard</li>
          <li className="rounded-lg border border-cyan-800/40 bg-[#0d1117]/70 p-3">Email + SMS delivery hooks</li>
        </ul>
        <a
          href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
          className="mt-6 inline-flex rounded-md bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Start with Stripe checkout
        </a>
      </section>

      <section className="grid gap-5">
        <h3 className="text-3xl font-bold text-white">FAQ</h3>
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
              <h4 className="text-base font-semibold text-cyan-200">{item.question}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <Suspense
        fallback={
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading checkout access controls...
          </section>
        }
      >
        <UnlockAccess />
      </Suspense>
    </main>
  );
}
