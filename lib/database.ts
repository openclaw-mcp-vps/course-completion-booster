import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CoursePlatform = "teachable" | "thinkific" | "custom";
export type NudgeChannel = "email" | "sms";

export interface StudentProgress {
  studentId: string;
  studentEmail: string;
  studentName?: string;
  phone?: string;
  courseId: string;
  courseName: string;
  platform: CoursePlatform;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  streakDays: number;
  engagementScore: number;
  riskScore: number;
  nudgesSent: number;
  lastActiveAt: string;
  lastNudgedAt?: string;
  updatedAt: string;
}

export interface ProgressEvent {
  id: string;
  platform: CoursePlatform;
  studentId: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  streakDays: number;
  occurredAt: string;
  receivedAt: string;
}

export interface NudgeLog {
  id: string;
  studentId: string;
  studentEmail: string;
  courseId: string;
  channel: NudgeChannel;
  templateKey: string;
  reason: string;
  message: string;
  providerStatus: "sent" | "simulated" | "failed";
  sentAt: string;
}

export interface PurchaseSession {
  sessionId: string;
  email?: string;
  purchasedAt: string;
}

interface DataStore {
  students: Record<string, StudentProgress>;
  events: ProgressEvent[];
  nudges: NudgeLog[];
  purchases: PurchaseSession[];
}

export interface UpsertStudentInput {
  studentId: string;
  studentEmail: string;
  studentName?: string;
  phone?: string;
  courseId: string;
  courseName: string;
  platform: CoursePlatform;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  streakDays: number;
  occurredAt: string;
}

export interface NudgeInput {
  studentId: string;
  studentEmail: string;
  courseId: string;
  channel: NudgeChannel;
  templateKey: string;
  reason: string;
  message: string;
  providerStatus: "sent" | "simulated" | "failed";
}

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIRECTORY, "store.json");

const defaultStore: DataStore = {
  students: {},
  events: [],
  nudges: [],
  purchases: []
};

let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<DataStore> {
  await ensureStoreFile();
  const raw = await readFile(DATA_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw) as Partial<DataStore>;
    return {
      students: parsed.students ?? {},
      events: parsed.events ?? [],
      nudges: parsed.nudges ?? [],
      purchases: parsed.purchases ?? []
    };
  } catch {
    await writeFile(DATA_PATH, JSON.stringify(defaultStore, null, 2), "utf-8");
    return defaultStore;
  }
}

async function writeStore(store: DataStore) {
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = writeQueue.then(task, task);
  writeQueue = nextTask.then(
    () => undefined,
    () => undefined
  );
  return nextTask;
}

export function calculateEngagementScore(input: {
  progressPercent: number;
  streakDays: number;
  daysSinceLastActive: number;
  lessonsCompleted: number;
  lessonsTotal: number;
}) {
  const completionRatio = input.lessonsTotal > 0 ? input.lessonsCompleted / input.lessonsTotal : 0;
  const recencyPenalty = Math.min(35, input.daysSinceLastActive * 5);
  const streakBoost = Math.min(25, input.streakDays * 2.5);
  const progressBoost = input.progressPercent * 0.45;
  const ratioBoost = completionRatio * 30;
  const score = progressBoost + ratioBoost + streakBoost - recencyPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateRiskScore(input: {
  progressPercent: number;
  daysSinceLastActive: number;
  streakDays: number;
  nudgesSent: number;
}) {
  const inactivityRisk = Math.min(50, input.daysSinceLastActive * 4.5);
  const lowProgressRisk = input.progressPercent < 30 ? 25 : input.progressPercent < 60 ? 10 : 0;
  const streakRisk = input.streakDays === 0 ? 15 : input.streakDays < 3 ? 8 : 0;
  const saturationRisk = input.nudgesSent > 5 ? 6 : 0;
  const raw = inactivityRisk + lowProgressRisk + streakRisk + saturationRisk;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export async function upsertStudentProgress(input: UpsertStudentInput) {
  return withWriteLock(async () => {
    const store = await readStore();
    const key = `${input.platform}:${input.courseId}:${input.studentId}`;
    const nowIso = new Date().toISOString();
    const existing = store.students[key];
    const lastActive = new Date(input.occurredAt);
    const daysSinceLastActive = Math.max(
      0,
      Math.floor((Date.now() - (Number.isNaN(lastActive.getTime()) ? Date.now() : lastActive.getTime())) / (1000 * 60 * 60 * 24))
    );

    const engagementScore = calculateEngagementScore({
      progressPercent: input.progressPercent,
      streakDays: input.streakDays,
      daysSinceLastActive,
      lessonsCompleted: input.lessonsCompleted,
      lessonsTotal: input.lessonsTotal
    });

    const nextNudgesSent = existing?.nudgesSent ?? 0;
    const riskScore = calculateRiskScore({
      progressPercent: input.progressPercent,
      daysSinceLastActive,
      streakDays: input.streakDays,
      nudgesSent: nextNudgesSent
    });

    const student: StudentProgress = {
      studentId: input.studentId,
      studentEmail: input.studentEmail,
      studentName: input.studentName,
      phone: input.phone,
      courseId: input.courseId,
      courseName: input.courseName,
      platform: input.platform,
      progressPercent: Math.max(0, Math.min(100, Math.round(input.progressPercent))),
      lessonsCompleted: Math.max(0, Math.round(input.lessonsCompleted)),
      lessonsTotal: Math.max(0, Math.round(input.lessonsTotal)),
      streakDays: Math.max(0, Math.round(input.streakDays)),
      engagementScore,
      riskScore,
      nudgesSent: nextNudgesSent,
      lastActiveAt: input.occurredAt,
      lastNudgedAt: existing?.lastNudgedAt,
      updatedAt: nowIso
    };

    store.students[key] = student;
    await writeStore(store);
    return student;
  });
}

export async function appendProgressEvent(event: Omit<ProgressEvent, "id" | "receivedAt">) {
  return withWriteLock(async () => {
    const store = await readStore();
    const savedEvent: ProgressEvent = {
      ...event,
      id: randomUUID(),
      receivedAt: new Date().toISOString()
    };

    store.events.push(savedEvent);
    if (store.events.length > 5000) {
      store.events = store.events.slice(-5000);
    }
    await writeStore(store);

    return savedEvent;
  });
}

export async function addNudgeLog(input: NudgeInput) {
  return withWriteLock(async () => {
    const store = await readStore();
    const studentKey = Object.keys(store.students).find(
      (key) =>
        store.students[key].studentId === input.studentId &&
        store.students[key].courseId === input.courseId &&
        store.students[key].studentEmail === input.studentEmail
    );

    const nudge: NudgeLog = {
      ...input,
      id: randomUUID(),
      sentAt: new Date().toISOString()
    };

    store.nudges.push(nudge);
    if (store.nudges.length > 5000) {
      store.nudges = store.nudges.slice(-5000);
    }

    if (studentKey) {
      const student = store.students[studentKey];
      store.students[studentKey] = {
        ...student,
        nudgesSent: student.nudgesSent + 1,
        lastNudgedAt: nudge.sentAt,
        riskScore: calculateRiskScore({
          progressPercent: student.progressPercent,
          daysSinceLastActive: Math.max(
            0,
            Math.floor((Date.now() - new Date(student.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
          ),
          streakDays: student.streakDays,
          nudgesSent: student.nudgesSent + 1
        }),
        updatedAt: nudge.sentAt
      };
    }

    await writeStore(store);
    return nudge;
  });
}

export async function recordPurchaseSession(sessionId: string, email?: string) {
  return withWriteLock(async () => {
    const store = await readStore();
    if (!store.purchases.find((purchase) => purchase.sessionId === sessionId)) {
      store.purchases.push({
        sessionId,
        email,
        purchasedAt: new Date().toISOString()
      });
      await writeStore(store);
    }
  });
}

export async function hasPurchaseSession(sessionId: string) {
  const store = await readStore();
  return store.purchases.some((purchase) => purchase.sessionId === sessionId);
}

export async function getSnapshot() {
  const store = await readStore();
  return {
    students: Object.values(store.students),
    events: store.events,
    nudges: store.nudges,
    purchases: store.purchases
  };
}

function accessSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "development-course-completion-booster-secret";
}

export function createAccessToken(sessionId: string) {
  const signature = createHmac("sha256", accessSecret()).update(sessionId).digest("hex");
  return `${sessionId}.${signature}`;
}

export function validateAccessToken(token: string) {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const sessionId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", accessSecret()).update(sessionId).digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  return sessionId;
}
