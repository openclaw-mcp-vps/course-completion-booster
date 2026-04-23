import { NextResponse } from "next/server";
import { z } from "zod";
import { appendProgressEvent, upsertStudentProgress } from "@/lib/database";
import { parseTeachableProgressEvent } from "@/lib/integrations/teachable";
import { parseThinkificProgressEvent } from "@/lib/integrations/thinkific";
import { sendNudgeForStudent } from "@/lib/nudge-engine";

const customPayloadSchema = z.object({
  studentId: z.union([z.string(), z.number()]),
  studentEmail: z.string().email(),
  studentName: z.string().optional(),
  phone: z.string().optional(),
  courseId: z.union([z.string(), z.number()]),
  courseName: z.string(),
  platform: z.enum(["custom"]).default("custom"),
  progressPercent: z.number().min(0).max(100),
  lessonsCompleted: z.number().nonnegative(),
  lessonsTotal: z.number().nonnegative(),
  streakDays: z.number().nonnegative(),
  occurredAt: z.string().optional(),
  autoNudge: z.boolean().optional()
});

function detectPlatform(headers: Headers, payload: unknown) {
  const headerPlatform = headers.get("x-course-platform") ?? headers.get("x-platform");
  if (headerPlatform === "teachable" || headerPlatform === "thinkific" || headerPlatform === "custom") {
    return headerPlatform;
  }

  if (typeof payload !== "object" || payload === null) {
    return "custom";
  }

  const typedPayload = payload as Record<string, unknown>;

  if (typedPayload.user_email || typedPayload.completion_percentage || typedPayload.progress) {
    return "thinkific";
  }

  if (typedPayload.user || typedPayload.enrollment || typedPayload.lectures_completed) {
    return "teachable";
  }

  return "custom";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const platform = detectPlatform(request.headers, payload);

    const normalized =
      platform === "teachable"
        ? parseTeachableProgressEvent(payload)
        : platform === "thinkific"
          ? parseThinkificProgressEvent(payload)
          : (() => {
              const parsed = customPayloadSchema.safeParse(payload);
              if (!parsed.success) {
                throw new Error(`Invalid custom payload: ${parsed.error.issues[0]?.message ?? "unknown format"}`);
              }

              const data = parsed.data;
              return {
                studentId: String(data.studentId),
                studentEmail: data.studentEmail,
                studentName: data.studentName,
                phone: data.phone,
                courseId: String(data.courseId),
                courseName: data.courseName,
                platform: data.platform,
                progressPercent: data.progressPercent,
                lessonsCompleted: data.lessonsCompleted,
                lessonsTotal: data.lessonsTotal,
                streakDays: data.streakDays,
                occurredAt: data.occurredAt ?? new Date().toISOString(),
                autoNudge: data.autoNudge
              };
            })();

    const student = await upsertStudentProgress(normalized);

    await appendProgressEvent({
      platform: student.platform,
      studentId: student.studentId,
      studentEmail: student.studentEmail,
      courseId: student.courseId,
      courseName: student.courseName,
      progressPercent: student.progressPercent,
      lessonsCompleted: student.lessonsCompleted,
      lessonsTotal: student.lessonsTotal,
      streakDays: student.streakDays,
      occurredAt: normalized.occurredAt
    });

    const shouldAutoNudge =
      Boolean((normalized as { autoNudge?: boolean }).autoNudge) || request.headers.get("x-auto-nudge") === "true";

    let nudgeStatus: "not-triggered" | "queued" = "not-triggered";
    if (shouldAutoNudge && student.riskScore >= 60) {
      await sendNudgeForStudent(student, student.progressPercent);
      nudgeStatus = "queued";
    }

    return NextResponse.json({
      ok: true,
      platform,
      student: {
        studentId: student.studentId,
        email: student.studentEmail,
        courseId: student.courseId,
        progressPercent: student.progressPercent,
        riskScore: student.riskScore,
        engagementScore: student.engagementScore
      },
      nudgeStatus
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
