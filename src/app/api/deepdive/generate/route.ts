import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { sources, language } = await req.json();

    const sourcesContext = (sources as { title: string; text: string }[])
      .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.text.substring(0, 10000)}`)
      .join("\n\n---\n\n");

    // Step 1: Generate the podcast script
    const scriptCompletion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `You are a podcast script writer. Create an engaging, conversational "Deep Dive" discussion between two hosts:
- **Host A (Chancellor)**: The wise strategist. Calm, deep-voiced, and visionary. He connects big ideas and looks at the strategic implications.
- **Host B (Sydney)**: The dynamic investigator. Curious, articulate, and energetic. She breaks down the details, asks pointed questions, and keeps the energy high.

Rules:
- Output in ${language || "English"}.
- Format as a dialogue: "CHANCELLOR: ..." and "SYDNEY: ..."
- Keep it natural, engaging, with "hmm", "right", "exactly" interjections.
- Cover the key themes, surprising findings, and practical takeaways from the sources.
- Keep total length to about 3-4 minutes of spoken content (~600-800 words).
- End with a memorable takeaway.

SOURCES:
${sourcesContext}`
        },
        { role: "user", content: "Generate the Deep Dive discussion script." }
      ],
    });

    const script = scriptCompletion.choices[0]?.message?.content || "";
    
    // Step 2: Parse script into segments
    const segments = script.split("\n").filter(line => line.trim());

    // Process audio segments in smaller batches to avoid rate limits and timeouts
    const audioSegments: Buffer[] = [];
    const batchSize = 3; // Process 3 segments at a time

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const batchPromises = batch.map(async (segment) => {
        const isChancellor = segment.trim().startsWith("CHANCELLOR:");
        const isSydney = segment.trim().startsWith("SYDNEY:");
        
        if (!isChancellor && !isSydney) return null;
        
        const text = segment.replace(/^(CHANCELLOR|SYDNEY):\s*/i, "").trim();
        if (!text) return null;

        // Onyx = deep male (Chancellor), Shimmer = clear female (Sydney)
        const voice = isChancellor ? "onyx" : "shimmer";
        
        try {
          const audioResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
          });
          return Buffer.from(await audioResponse.arrayBuffer());
        } catch (err) {
          console.error(`TTS failed for segment: "${text.substring(0, 30)}..."`, err);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) {
        if (res) audioSegments.push(res);
      }
    }

    if (audioSegments.length === 0) {
      throw new Error("No audio segments were successfully generated.");
    }

    // Concatenate all audio segments into a single MP3
    const fullAudio = Buffer.concat(audioSegments);

    return new Response(fullAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullAudio.byteLength.toString(),
        "Content-Disposition": "attachment; filename=deep-dive.mp3",
        "x-transcript": encodeURIComponent(script),
      },
    });
  } catch (err: any) {
    console.error("Deep Dive generation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
