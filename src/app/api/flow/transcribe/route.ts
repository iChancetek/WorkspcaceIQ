import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "text",
    });

    return NextResponse.json({ text: transcription });
  } catch (err: any) {
    console.error("Transcription error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
