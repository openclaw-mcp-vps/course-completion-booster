import OpenAI from "openai";
import { Resend } from "resend";
import twilio from "twilio";
import type { NudgeChannel, StudentProgress } from "@/lib/database";
import { addNudgeLog } from "@/lib/database";

export interface NudgeDraft {
  templateKey: string;
  reason: string;
  subject: string;
  message: string;
  channel: NudgeChannel;
}

function daysSince(dateIso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24)));
}

function chooseRuleBasedDraft(student: StudentProgress, cohortAverageProgress: number): NudgeDraft {
  const idleDays = daysSince(student.lastActiveAt);
  const progressGap = Math.max(0, Math.round((cohortAverageProgress - student.progressPercent) * 10) / 10);

  if (student.progressPercent >= 85 && student.progressPercent < 100) {
    return {
      templateKey: "near-finish",
      reason: "Student is close to finishing and benefits from completion framing.",
      subject: `You're one focused session away from finishing ${student.courseName}`,
      message:
        `You are at ${student.progressPercent}% in ${student.courseName}. ` +
        "A 30-minute sprint today can get you to the finish line. " +
        "Complete the next lesson now while your momentum is high.",
      channel: "email"
    };
  }

  if (idleDays >= 5) {
    return {
      templateKey: "reactivation",
      reason: "Student has been inactive for multiple days and needs a fast restart prompt.",
      subject: `Let's get your ${student.courseName} streak back today`,
      message:
        `You have not logged progress for ${idleDays} days. ` +
        "Pick one short lesson and restart your streak today. " +
        "Most students who return for one session regain momentum within the same week.",
      channel: student.phone ? "sms" : "email"
    };
  }

  if (progressGap >= 15) {
    return {
      templateKey: "peer-benchmark",
      reason: "Student is trailing cohort average and can benefit from peer-context motivation.",
      subject: `Quick win plan to catch up in ${student.courseName}`,
      message:
        `You're currently at ${student.progressPercent}% and your cohort average is ${cohortAverageProgress}%. ` +
        "A focused 45-minute study block this week can close most of that gap. " +
        "Start with the next uncompleted lesson and keep your streak alive.",
      channel: "email"
    };
  }

  return {
    templateKey: "consistency",
    reason: "Student is progressing and should receive reinforcement for consistency.",
    subject: `Strong progress so far in ${student.courseName}`,
    message:
      `You're at ${student.progressPercent}% completion with a ${student.streakDays}-day streak. ` +
      "Keep your cadence and schedule your next session now so momentum stays intact.",
    channel: student.phone ? "sms" : "email"
  };
}

async function maybeGenerateAiVariant(student: StudentProgress, draft: NudgeDraft) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.6,
      input: [
        {
          role: "system",
          content:
            "You write concise, motivating nudges for adult online learners. Keep tone practical and specific. Return JSON only."
        },
        {
          role: "user",
          content: JSON.stringify({
            student: {
              course: student.courseName,
              progressPercent: student.progressPercent,
              streakDays: student.streakDays,
              riskScore: student.riskScore,
              daysSinceLastActive: daysSince(student.lastActiveAt)
            },
            baseDraft: draft,
            outputSchema: {
              subject: "string",
              message: "string"
            }
          })
        }
      ]
    });

    const json = JSON.parse(response.output_text || "{}");
    if (typeof json.subject !== "string" || typeof json.message !== "string") {
      return null;
    }

    return {
      subject: json.subject,
      message: json.message
    };
  } catch {
    return null;
  }
}

async function sendViaEmail(student: StudentProgress, draft: NudgeDraft) {
  if (!process.env.RESEND_API_KEY || !process.env.NUDGE_FROM_EMAIL) {
    return { status: "simulated" as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.NUDGE_FROM_EMAIL,
    to: student.studentEmail,
    subject: draft.subject,
    text: draft.message
  });

  return { status: "sent" as const };
}

async function sendViaSms(student: StudentProgress, draft: NudgeDraft) {
  if (!student.phone) {
    return { status: "simulated" as const };
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return { status: "simulated" as const };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to: student.phone,
    body: `${draft.subject}\n\n${draft.message}`
  });

  return { status: "sent" as const };
}

export async function generateNudgeDraft(student: StudentProgress, cohortAverageProgress: number) {
  const baseDraft = chooseRuleBasedDraft(student, cohortAverageProgress);
  const aiVariant = await maybeGenerateAiVariant(student, baseDraft);

  if (!aiVariant) {
    return baseDraft;
  }

  return {
    ...baseDraft,
    subject: aiVariant.subject,
    message: aiVariant.message
  };
}

export async function sendNudgeForStudent(student: StudentProgress, cohortAverageProgress: number, channel?: NudgeChannel) {
  const draft = await generateNudgeDraft(student, cohortAverageProgress);
  const selectedChannel = channel ?? draft.channel;

  try {
    const result =
      selectedChannel === "sms" ? await sendViaSms(student, draft) : await sendViaEmail(student, draft);

    const nudge = await addNudgeLog({
      studentId: student.studentId,
      studentEmail: student.studentEmail,
      courseId: student.courseId,
      channel: selectedChannel,
      templateKey: draft.templateKey,
      reason: draft.reason,
      message: draft.message,
      providerStatus: result.status
    });

    return {
      draft,
      status: result.status,
      nudgeId: nudge.id
    };
  } catch {
    const nudge = await addNudgeLog({
      studentId: student.studentId,
      studentEmail: student.studentEmail,
      courseId: student.courseId,
      channel: selectedChannel,
      templateKey: draft.templateKey,
      reason: draft.reason,
      message: draft.message,
      providerStatus: "failed"
    });

    return {
      draft,
      status: "failed" as const,
      nudgeId: nudge.id
    };
  }
}

export const nudgeTemplateReference = [
  {
    key: "reactivation",
    title: "Reactivation nudge",
    trigger: "No progress for 5+ days",
    expectedLift: "8-14% return-to-course sessions"
  },
  {
    key: "peer-benchmark",
    title: "Peer benchmark nudge",
    trigger: "Student is 15%+ behind cohort",
    expectedLift: "6-10% lesson completion recovery"
  },
  {
    key: "near-finish",
    title: "Near completion nudge",
    trigger: "Student reached 85-99% completion",
    expectedLift: "12-20% final module completion"
  },
  {
    key: "consistency",
    title: "Consistency reinforcement",
    trigger: "Steady progress, low risk",
    expectedLift: "Higher weekly lesson cadence"
  }
];
