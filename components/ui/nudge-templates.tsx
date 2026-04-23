"use client";

import { useMemo, useState } from "react";
import type { NudgeChannel, StudentProgress } from "@/lib/database";

interface NudgeTemplatesProps {
  templates: {
    key: string;
    title: string;
    trigger: string;
    expectedLift: string;
  }[];
  students: StudentProgress[];
}

type SendStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export function NudgeTemplates({ templates, students }: NudgeTemplatesProps) {
  const [selectedStudentKey, setSelectedStudentKey] = useState<string>(
    students[0] ? `${students[0].studentId}::${students[0].courseId}` : ""
  );
  const [channel, setChannel] = useState<NudgeChannel>("email");
  const [status, setStatus] = useState<SendStatus>({ type: "idle", message: "" });

  const selectedStudent = useMemo(
    () => students.find((student) => `${student.studentId}::${student.courseId}` === selectedStudentKey),
    [selectedStudentKey, students]
  );

  const onSendNudge = async () => {
    if (!selectedStudent) {
      setStatus({ type: "error", message: "Select a student before sending a nudge." });
      return;
    }

    setStatus({ type: "loading", message: "Sending nudge..." });

    try {
      const response = await fetch("/api/nudges/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          courseId: selectedStudent.courseId,
          channel
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = (await response.json()) as {
        result: {
          draft: {
            subject: string;
          };
          status: string;
        };
      };

      setStatus({
        type: "success",
        message: `Nudge queued with template subject: "${payload.result.draft.subject}" (${payload.result.status}).`
      });
    } catch {
      setStatus({ type: "error", message: "Could not send nudge. Check server logs or API credentials." });
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h3 className="text-lg font-semibold text-white">Nudge Template Library</h3>
        <p className="mt-2 text-sm text-slate-300">
          Templates are selected automatically based on inactivity, progress gap, and completion proximity.
        </p>

        <div className="mt-4 grid gap-3">
          {templates.map((template) => (
            <article key={template.key} className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-cyan-200">{template.title}</p>
                <p className="rounded-full bg-cyan-950/70 px-3 py-1 text-xs text-cyan-300">{template.key}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">Trigger: {template.trigger}</p>
              <p className="mt-1 text-xs text-slate-400">Expected lift: {template.expectedLift}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h3 className="text-lg font-semibold text-white">Send a Nudge</h3>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Student</label>
        <select
          value={selectedStudentKey}
          onChange={(event) => setSelectedStudentKey(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
        >
          {students.map((student) => (
            <option
              key={`${student.studentId}:${student.courseId}`}
              value={`${student.studentId}::${student.courseId}`}
            >
              {student.studentEmail} - {student.courseName} ({student.progressPercent}%)
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Channel</label>
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value as NudgeChannel)}
          className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>

        {selectedStudent ? (
          <p className="mt-3 text-xs text-slate-400">
            Risk score {selectedStudent.riskScore}/100, engagement {selectedStudent.engagementScore}/100, last active {" "}
            {new Date(selectedStudent.lastActiveAt).toLocaleDateString()}.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onSendNudge}
          className="mt-5 w-full rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Generate + send nudge
        </button>

        {status.type !== "idle" ? (
          <p
            className={`mt-3 text-sm ${
              status.type === "success" ? "text-emerald-300" : status.type === "error" ? "text-rose-300" : "text-slate-300"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
