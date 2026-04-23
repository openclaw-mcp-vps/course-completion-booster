import { z } from "zod";
import type { UpsertStudentInput } from "@/lib/database";

const teachableEventSchema = z
  .object({
    occurred_at: z.string().optional(),
    user: z
      .object({
        id: z.union([z.string(), z.number()]),
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional()
      })
      .optional(),
    student: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        phone: z.string().optional()
      })
      .optional(),
    course: z
      .object({
        id: z.union([z.string(), z.number()]),
        name: z.string().optional()
      })
      .optional(),
    enrollment: z
      .object({
        course_id: z.union([z.string(), z.number()]).optional(),
        course_name: z.string().optional(),
        completed_percent: z.number().optional(),
        lectures_completed: z.number().optional(),
        lectures_total: z.number().optional(),
        streak_days: z.number().optional()
      })
      .optional(),
    progress_percent: z.number().optional(),
    completed_percent: z.number().optional(),
    lectures_completed: z.number().optional(),
    lectures_total: z.number().optional(),
    streak_days: z.number().optional()
  })
  .passthrough();

export function parseTeachableProgressEvent(payload: unknown): UpsertStudentInput {
  const parsed = teachableEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid Teachable payload: ${parsed.error.issues[0]?.message ?? "unknown format"}`);
  }

  const data = parsed.data;
  const learner = data.user ?? data.student;

  if (!learner?.email) {
    throw new Error("Teachable payload missing learner email");
  }

  const studentIdSource = learner.id ?? learner.email;
  const courseIdSource = data.course?.id ?? data.enrollment?.course_id;

  if (!courseIdSource) {
    throw new Error("Teachable payload missing course id");
  }

  const progressPercent =
    data.progress_percent ?? data.completed_percent ?? data.enrollment?.completed_percent ?? 0;

  const lessonsCompleted = data.lectures_completed ?? data.enrollment?.lectures_completed ?? 0;
  const lessonsTotal = data.lectures_total ?? data.enrollment?.lectures_total ?? 0;

  return {
    studentId: String(studentIdSource),
    studentEmail: learner.email,
    studentName: learner.name,
    phone: learner.phone,
    courseId: String(courseIdSource),
    courseName: data.course?.name ?? data.enrollment?.course_name ?? "Untitled Teachable Course",
    platform: "teachable",
    progressPercent,
    lessonsCompleted,
    lessonsTotal,
    streakDays: data.streak_days ?? data.enrollment?.streak_days ?? 0,
    occurredAt: data.occurred_at ?? new Date().toISOString()
  };
}
