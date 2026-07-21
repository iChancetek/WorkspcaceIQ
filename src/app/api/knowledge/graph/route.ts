import { NextRequest, NextResponse } from "next/server";
import { getAllNodes, getAllEdges } from "@/lib/firebase/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/knowledge/graph
 * 
 * Returns the full knowledge graph (nodes + edges) for a user.
 * Used by the graph visualization components.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, nodeLimit, edgeLimit } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [nodes, edges] = await Promise.all([
      getAllNodes(userId, nodeLimit || 200),
      getAllEdges(userId, edgeLimit || 500),
    ]);

    return NextResponse.json({
      nodes,
      edges,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  } catch (err: any) {
    console.error("[Knowledge Graph] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
