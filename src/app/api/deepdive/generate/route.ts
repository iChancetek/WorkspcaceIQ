import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

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
- **Host A (Alex)**: The enthusiastic explainer who breaks down concepts.
- **Host B (Sam)**: The curious questioner who pushes deeper and plays devil's advocate.

Rules:
- Output in ${language || "English"}.
- Format as a dialogue: "ALEX: ..." and "SAM: ..."
- Keep it natural, engaging, with "hmm", "right", "exactly" interjections.
- Cover the key themes, surprising findings, and practical takeaways from the sources.
- Keep total length to about 2-3 minutes of spoken content (~400-500 words).
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
    const audioSegments: Buffer[] = [];

    for (const segment of segments) {
      const isAlex = segment.trim().startsWith("ALEX:");
      const isSam = segment.trim().startsWith("SAM:");
      
      if (!isAlex && !isSam) continue;
      
      const text = segment.replace(/^(ALEX|SAM):\s*/i, "").trim();
      if (!text) continue;

      // Nova = calm female (Alex), Echo = deeper male (Sam)
      const voice = isAlex ? "nova" : "echo";
      
      const audioResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text,
      });

      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      audioSegments.push(buffer);
    }

    // Concatenate all audio segments into a single MP3
    const fullAudio = Buffer.concat(audioSegments);

    return new Response(fullAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullAudio.byteLength.toString(),
        "Content-Disposition": "attachment; filename=deep-dive.mp3",
      },
    });
  } catch (err: any) {
    console.error("Deep Dive generation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
