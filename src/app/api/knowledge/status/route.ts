import { NextRequest, NextResponse } from "next/server";
import { getJobStatus, getKnowledgeStats, getGraphStats } from "@/lib/firebase/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/knowledge/status
 * 
 * Returns processing status for active ingestion jobs and overall workspace stats.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, jobId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // If a specific job ID is requested, return its status
    if (jobId) {
      const job = await getJobStatus(userId, jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    // Otherwise, return overall workspace stats
    const [sourceStats, graphStats] = await Promise.all([
      getKnowledgeStats(userId),
      getGraphStats(userId),
    ]);

    return NextResponse.json({
      sources: sourceStats,
      graph: graphStats,
    });
  } catch (err: any) {
    console.error("[Knowledge Status] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
