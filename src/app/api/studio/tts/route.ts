import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTextIntoChunks(text: string, maxChunkLen = 3000): string[] {
  if (text.length <= maxChunkLen) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkLen) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "nova" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    const cleanText = cleanHtmlToText(text);
    if (!cleanText) {
      return new Response(JSON.stringify({ error: "Text is empty after cleaning" }), { status: 400 });
    }

    const chunks = splitTextIntoChunks(cleanText, 3000);
    const audioBuffers: Buffer[] = [];

    const batchSize = 2;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (chunk) => {
          try {
            const res = await openai.audio.speech.create({
              model: "tts-1",
              voice: (voice as any) || "nova",
              input: chunk,
            });
            return Buffer.from(await res.arrayBuffer());
          } catch (err: any) {
            console.error("[Studio TTS] Error synthesizing chunk:", err.message);
            return null;
          }
        })
      );
      for (const buf of results) {
        if (buf) audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error("Failed to synthesize report audio");
    }

    const fullAudio = Buffer.concat(audioBuffers);

    return new Response(fullAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullAudio.byteLength.toString(),
        "Content-Disposition": "attachment; filename=report-narration.mp3",
      },
    });
  } catch (err: any) {
    console.error("[Studio TTS Error]:", err);
    return new Response(JSON.stringify({ error: err.message || "TTS generation failed" }), { status: 500 });
  }
}
