import { NextResponse } from "next/server";
import { z } from "zod";
import { getSnapshot, type StudentProgress } from "@/lib/database";
import { sendNudgeForStudent } from "@/lib/nudge-engine";

const sendNudgeSchema = z.object({
  studentId: z.string(),
  courseId: z.string().optional(),
  channel: z.enum(["email", "sms"]).optional()
});

function findStudent(students: StudentProgress[], studentId: string, courseId?: string) {
  if (courseId) {
    return students.find((student) => student.studentId === studentId && student.courseId === courseId);
  }

  return students.find((student) => student.studentId === studentId);
}

function averageProgressForCourse(students: StudentProgress[], courseId: string) {
  const sameCourse = students.filter((student) => student.courseId === courseId);
  if (sameCourse.length === 0) {
    return 0;
  }

  return sameCourse.reduce((sum, student) => sum + student.progressPercent, 0) / sameCourse.length;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendNudgeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const snapshot = await getSnapshot();
    const student = findStudent(snapshot.students, parsed.data.studentId, parsed.data.courseId);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const cohortAverage = averageProgressForCourse(snapshot.students, student.courseId);
    const result = await sendNudgeForStudent(student, cohortAverage, parsed.data.channel);

    return NextResponse.json({
      ok: true,
      student: {
        studentId: student.studentId,
        email: student.studentEmail,
        courseId: student.courseId
      },
      result
    });
  } catch {
    return NextResponse.json({ error: "Failed to send nudge" }, { status: 500 });
  }
}
