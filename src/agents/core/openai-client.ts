import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers";

const apiKey = process.env.OPENAI_API_KEY || process.env["OPENAI_API_KEY "] || "dummy_build_key";

if (apiKey === "dummy_build_key") {
  console.warn("[OpenAI] WARNING: Using dummy_build_key. OpenAI requests will likely fail. Ensure OPENAI_API_KEY is set in environment variables.");
}

const rawOpenai = new OpenAI({
  apiKey: apiKey,
});

export const openai = process.env.LANGSMITH_TRACING === "true" 
  ? wrapOpenAI(rawOpenai) 
  : rawOpenai;

export interface GPT54Input {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Creates a stream using the GPT-5.4 specified responses API.
 */
export async function createGpt54StreamingResponse(
  systemPrompt: string,
  userContent: string,
  model = "gpt-5.4"
) {
  return await (openai as any).responses.create({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    stream: true,
  });
}
