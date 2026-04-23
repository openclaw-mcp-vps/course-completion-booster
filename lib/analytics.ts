import { formatISO, subDays } from "date-fns";
import type { NudgeLog, ProgressEvent, StudentProgress } from "@/lib/database";
import { getSnapshot } from "@/lib/database";

export interface DailyProgressPoint {
  date: string;
  averageProgress: number;
  activeStudents: number;
}

export interface AnalyticsSummary {
  totalStudents: number;
  activeStudents: number;
  atRiskStudents: number;
  averageProgress: number;
  projectedCompletionRate: number;
  averageEngagementScore: number;
  nudgesSentLast7Days: number;
  chart: DailyProgressPoint[];
  topRiskStudents: StudentProgress[];
  recentNudges: NudgeLog[];
}

function getDaysAgoIso(daysAgo: number) {
  return formatISO(subDays(new Date(), daysAgo));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildTrend(events: ProgressEvent[]): DailyProgressPoint[] {
  const buckets = new Map<string, { totalProgress: number; count: number; students: Set<string> }>();

  for (let i = 6; i >= 0; i -= 1) {
    const day = formatISO(subDays(new Date(), i), { representation: "date" });
    buckets.set(day, { totalProgress: 0, count: 0, students: new Set<string>() });
  }

  events.forEach((event) => {
    const day = formatISO(new Date(event.occurredAt), { representation: "date" });
    const bucket = buckets.get(day);
    if (!bucket) {
      return;
    }

    bucket.totalProgress += event.progressPercent;
    bucket.count += 1;
    bucket.students.add(event.studentId);
  });

  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    averageProgress: bucket.count > 0 ? Math.round((bucket.totalProgress / bucket.count) * 10) / 10 : 0,
    activeStudents: bucket.students.size
  }));
}

export async function buildAnalyticsSummary(): Promise<AnalyticsSummary> {
  const snapshot = await getSnapshot();
  const students = snapshot.students;
  const recentThreshold = getDaysAgoIso(7);

  const activeStudents = students.filter((student) => student.lastActiveAt >= recentThreshold);
  const atRiskStudents = students.filter((student) => student.riskScore >= 55);
  const completedStudents = students.filter((student) => student.progressPercent >= 100);

  const projectedCompletionRate = students.length === 0 ? 0 : (completedStudents.length / students.length) * 100;

  const nudgesSentLast7Days = snapshot.nudges.filter((nudge) => nudge.sentAt >= recentThreshold).length;

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    atRiskStudents: atRiskStudents.length,
    averageProgress: Math.round(average(students.map((student) => student.progressPercent)) * 10) / 10,
    projectedCompletionRate: Math.round(projectedCompletionRate * 10) / 10,
    averageEngagementScore: Math.round(average(students.map((student) => student.engagementScore)) * 10) / 10,
    nudgesSentLast7Days,
    chart: buildTrend(snapshot.events),
    topRiskStudents: [...students]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8),
    recentNudges: [...snapshot.nudges]
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, 8)
  };
}
