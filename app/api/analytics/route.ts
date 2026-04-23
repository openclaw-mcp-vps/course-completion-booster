import { NextResponse } from "next/server";
import { buildAnalyticsSummary } from "@/lib/analytics";

export async function GET() {
  const analytics = await buildAnalyticsSummary();
  return NextResponse.json(analytics);
}
