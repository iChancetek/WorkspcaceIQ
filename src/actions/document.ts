"use server";

import { openai } from "@/agents/core/openai-client";

export async function extractDocumentText(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  
  if (!file) throw new Error("No file provided.");

  const fileName = file.name.toLowerCase();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // TXT
  if (fileName.endsWith(".txt")) {
    return new TextDecoder().decode(fileBuffer);
  }

  // PDF
  if (fileName.endsWith(".pdf")) {
    // @ts-ignore - Dynamic import typing for pdf-parse can be inconsistent across environments
    const pdfParse = (await import("pdf-parse")) as any;
    const data = await pdfParse(fileBuffer);
    return data.text;
  }

  // DOCX
  if (fileName.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }

  // Audio files → Whisper
  if (fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".webm") || fileName.endsWith(".m4a")) {
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });
    return transcription.text;
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}
