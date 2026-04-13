import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { transcript, mode, language } = await req.json();

    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript provided" }), { status: 400 });
    }

    let script = "";
    const audioSegments: Buffer[] = [];

    if (mode === "recap") {
      // Alex & Sam Discussion Recap
      const scriptCompletion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 3000,
        messages: [
          {
            role: "system",
            content: `You are a podcast script writer. Create a debrief of the following conversation between two people.
Two hosts:
- **Chancellor**: The wise strategist. Calm, deep-voiced, and visionary. He connects big ideas and looks at the strategic implications.
- **Sydney**: The dynamic investigator. Curious, articulate, and energetic. She breaks down the details, asks pointed questions, and keeps the energy high.

Rules:
- Output in ${language || "English"}.
- Format as a dialogue: "CHANCELLOR: ..." and "SYDNEY: ..."
- Keep it professional yet engaging.
- Total length: ~4-6 minutes of spoken content.

CONVERSATION TRANSCRIPT:
${transcript}`
          },
          { role: "user", content: "Generate the conversation recap script." }
        ],
      });

      script = scriptCompletion[0]?.message?.content || "";
    } else {
      // Enhanced Replay Mode
      // We refine the transcript to be more "podcast-like" while keeping the original flow
      const scriptCompletion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 4000,
        messages: [
          {
            role: "system",
            content: `You are an audio producer. Clean up and organize the following raw conversation transcript into a high-quality "replayed" podcast script.
            
Rules:
- Keep the original flow but remove stutters, fillers, and clarify ambiguous sentences.
- Label the speakers as CHANCELLOR (as Speaker A) and SYDNEY (as Speaker B).
- Format as "CHANCELLOR: ..." and "SYDNEY: ..."
- Language: ${language || "original languages used in transcript"}.

CONVERSATION TRANSCRIPT:
${transcript}`
          },
          { role: "user", content: "Generate the enhanced replay script." }
        ],
      });

      script = scriptCompletion.choices[0]?.message?.content || "";
    }

    // Step 2: Parse script into segments and generate audio
    const segments = script.split("\n").filter(line => line.trim());

    for (const segment of segments) {
      const isChancellor = segment.trim().startsWith("CHANCELLOR:");
      const isSydney = segment.trim().startsWith("SYDNEY:");
      
      if (!isChancellor && !isSydney) continue;
      
      const text = segment.replace(/^(CHANCELLOR|SYDNEY):\s*/i, "").trim();
      if (!text) continue;

      // Assign voices
      // Chancellor = Onyx (Male), Sydney = Shimmer (Female)
      const voice = isChancellor ? "onyx" : "shimmer";
      
      const audioResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: text,
      });

      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      audioSegments.push(buffer);
    }

    const fullAudio = Buffer.concat(audioSegments);

    return new Response(fullAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullAudio.byteLength.toString(),
        "x-transcript": encodeURIComponent(script),
      },
    });
  } catch (err: any) {
    console.error("Live Podcast generation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
