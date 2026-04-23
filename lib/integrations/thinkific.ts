import { z } from "zod";
import type { UpsertStudentInput } from "@/lib/database";

const thinkificEventSchema = z
  .object({
    event_time: z.string().optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    user_email: z.string().email().optional(),
    user_name: z.string().optional(),
    phone: z.string().optional(),
    course_id: z.union([z.string(), z.number()]).optional(),
    course_name: z.string().optional(),
    completion_percentage: z.number().optional(),
    completed_lessons: z.number().optional(),
    total_lessons: z.number().optional(),
    streak_days: z.number().optional(),
    user: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        email: z.string().email().optional(),
        name: z.string().optional()
      })
      .optional(),
    course: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional()
      })
      .optional(),
    progress: z
      .object({
        percent: z.number().optional(),
        lessons_completed: z.number().optional(),
        lessons_total: z.number().optional(),
        streak_days: z.number().optional()
      })
      .optional()
  })
  .passthrough();

export function parseThinkificProgressEvent(payload: unknown): UpsertStudentInput {
  const parsed = thinkificEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid Thinkific payload: ${parsed.error.issues[0]?.message ?? "unknown format"}`);
  }

  const data = parsed.data;

  const studentEmail = data.user_email ?? data.user?.email;
  if (!studentEmail) {
    throw new Error("Thinkific payload missing student email");
  }

  const studentId = data.user_id ?? data.user?.id ?? studentEmail;
  const courseId = data.course_id ?? data.course?.id;

  if (!courseId) {
    throw new Error("Thinkific payload missing course id");
  }

  return {
    studentId: String(studentId),
    studentEmail,
    studentName: data.user_name ?? data.user?.name,
    phone: data.phone,
    courseId: String(courseId),
    courseName: data.course_name ?? data.course?.name ?? "Untitled Thinkific Course",
    platform: "thinkific",
    progressPercent: data.completion_percentage ?? data.progress?.percent ?? 0,
    lessonsCompleted: data.completed_lessons ?? data.progress?.lessons_completed ?? 0,
    lessonsTotal: data.total_lessons ?? data.progress?.lessons_total ?? 0,
    streakDays: data.streak_days ?? data.progress?.streak_days ?? 0,
    occurredAt: data.event_time ?? new Date().toISOString()
  };
}
