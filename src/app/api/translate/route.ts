import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage, autoDetect } = await req.json();

    if (!text || text.trim() === "") {
      return new Response(JSON.stringify({ text: "" }), { status: 200 });
    }

    const sourceDirective = autoDetect ? "The spoken language should be automatically detected." : `The spoken language is ${sourceLanguage}.`;

    const systemPrompt = `You are a real-time, highly accurate live voice translator.
Your task is to instantly translate the provided speech transcription into ${targetLanguage}.
${sourceDirective}
RULES:
1. Output ONLY the translated text. No conversational filler, no introductions.
2. If the text appears to be a fragment or incomplete sentence, translate it as best as possible without attempting to "finish" the thought.
3. Maintain the exact tone, intent, and meaning of the original speaker.
4. If the source text is ALREADY in ${targetLanguage}, just improve its grammar slightly and output it.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.2, // Low temperature for factual, rigid translation
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ translatedText }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Translation API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
