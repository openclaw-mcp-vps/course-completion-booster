import { formatDistanceToNow } from "date-fns";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NudgeTemplates } from "@/components/ui/nudge-templates";
import { ProgressChart } from "@/components/ui/progress-chart";
import { buildAnalyticsSummary } from "@/lib/analytics";
import { hasPurchaseSession, validateAccessToken } from "@/lib/database";
import { nudgeTemplateReference } from "@/lib/nudge-engine";

function metricCard(label: string, value: string, hint: string) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </article>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get("ccb_access")?.value;

  if (!accessCookie) {
    redirect("/?paywall=locked");
  }

  const sessionId = validateAccessToken(accessCookie);

  if (!sessionId) {
    redirect("/?paywall=locked");
  }

  const hasPaidAccess = sessionId === "dev-access" || (await hasPurchaseSession(sessionId));

  if (!hasPaidAccess) {
    redirect("/?paywall=locked");
  }

  const analytics = await buildAnalyticsSummary();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
      <header className="rounded-2xl border border-slate-700 bg-[#111827]/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Retention dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Course Completion Booster</h1>
            <p className="mt-2 text-sm text-slate-300">
              Monitor risk patterns, evaluate engagement trends, and trigger individualized nudges for at-risk students.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-300"
          >
            Back to landing page
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard("Tracked Students", analytics.totalStudents.toString(), "Unique student-course records currently monitored")}
        {metricCard("At-Risk", analytics.atRiskStudents.toString(), "Risk score >= 55 indicates likely dropout without intervention")}
        {metricCard("Avg Progress", `${analytics.averageProgress}%`, "Average completion percentage across active enrollments")}
        {metricCard("Nudges (7d)", analytics.nudgesSentLast7Days.toString(), "Messages sent in the last seven days")}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Momentum trend</h2>
            <p className="mt-1 text-sm text-slate-300">
              Average progress and active learner count over the last week to detect slowdowns before dropouts spike.
            </p>
          </div>
          <p className="text-sm text-slate-400">Projected completion rate: {analytics.projectedCompletionRate}%</p>
        </div>
        <div className="mt-4">
          <ProgressChart data={analytics.chart} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold text-white">Highest-risk students</h2>
        <p className="mt-1 text-sm text-slate-300">
          Prioritize outreach where inactivity and low momentum create the highest probability of churn.
        </p>

        {analytics.topRiskStudents.length === 0 ? (
          <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p>No student events received yet.</p>
            <p className="mt-2">
              Send a webhook event to <code>/api/webhooks/course-progress</code> from Teachable or Thinkific to populate live analytics.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] table-auto border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 text-xs uppercase tracking-[0.15em] text-slate-400">
                  <th className="py-3">Student</th>
                  <th className="py-3">Course</th>
                  <th className="py-3">Progress</th>
                  <th className="py-3">Risk</th>
                  <th className="py-3">Engagement</th>
                  <th className="py-3">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topRiskStudents.map((student) => (
                  <tr key={`${student.platform}:${student.courseId}:${student.studentId}`} className="border-b border-slate-800/70">
                    <td className="py-3">
                      <p className="font-medium text-white">{student.studentName ?? student.studentEmail}</p>
                      <p className="text-xs text-slate-400">{student.studentEmail}</p>
                    </td>
                    <td className="py-3 text-slate-300">{student.courseName}</td>
                    <td className="py-3">{student.progressPercent}%</td>
                    <td className="py-3">{student.riskScore}/100</td>
                    <td className="py-3">{student.engagementScore}/100</td>
                    <td className="py-3 text-slate-400">
                      {formatDistanceToNow(new Date(student.lastActiveAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <NudgeTemplates templates={nudgeTemplateReference} students={analytics.topRiskStudents} />

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold text-white">Recent nudge log</h2>
        <p className="mt-1 text-sm text-slate-300">Latest outreach attempts with delivery status tracking.</p>

        {analytics.recentNudges.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No nudges have been sent yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {analytics.recentNudges.map((nudge) => (
              <article key={nudge.id} className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-cyan-200">{nudge.studentEmail}</p>
                  <p className="text-xs text-slate-400">
                    {nudge.channel.toUpperCase()} • {nudge.providerStatus} • {formatDistanceToNow(new Date(nudge.sentAt), { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-400">Template: {nudge.templateKey}</p>
                <p className="mt-2 text-sm text-slate-200">{nudge.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
