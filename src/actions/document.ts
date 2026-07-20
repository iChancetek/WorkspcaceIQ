"use server";

import { openai } from "@/agents/core/openai-client";
import zlib from "zlib";

// ─── Zero-Dependency ZIP Reader ─────────────────────────────────────────────

function unzipInMemory(buffer: Buffer): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  let offset = 0;

  try {
    while (offset < buffer.length - 30) {
      const signature = buffer.readUInt32LE(offset);
      if (signature !== 0x04034b50) {
        break; // Central directory or end of ZIP
      }

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const filenameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const filename = buffer.toString("utf8", offset + 30, offset + 30 + filenameLength);
      const dataOffset = offset + 30 + filenameLength + extraFieldLength;
      const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);

      if (compressionMethod === 8) {
        try {
          files[filename] = zlib.inflateRawSync(compressedData);
        } catch {
          // Skip if decompression fails
        }
      } else if (compressionMethod === 0) {
        files[filename] = compressedData;
      }

      offset = dataOffset + compressedSize;
    }
  } catch (err: any) {
    console.warn("[unzip] In-memory zip parse partial failure:", err.message);
  }

  return files;
}

export async function extractDocumentText(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  
  if (!file) throw new Error("No file provided.");

  const fileName = file.name.toLowerCase();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // TXT
  if (fileName.endsWith(".txt")) {
    return new TextDecoder().decode(fileBuffer);
  }

  // Markdown (.md)
  if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) {
    return new TextDecoder().decode(fileBuffer);
  }

  // RTF (.rtf)
  if (fileName.endsWith(".rtf")) {
    const text = new TextDecoder().decode(fileBuffer);
    return text
      .replace(/\\([a-z]{1,32})(-?\d+)? ?/g, "")
      .replace(/\{[^}]+\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
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

  // PowerPoint (.pptx)
  if (fileName.endsWith(".pptx")) {
    const files = unzipInMemory(fileBuffer);
    const slideTexts: string[] = [];

    const slideKeys = Object.keys(files)
      .filter((k) => k.startsWith("ppt/slides/slide") && k.endsWith(".xml"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?. [0] || "0", 10);
        const numB = parseInt(b.match(/\d+/)?. [0] || "0", 10);
        return numA - numB;
      });

    for (const key of slideKeys) {
      const xml = files[key].toString("utf8");
      const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
      const text = matches
        .map((m) => m.replace(/<a:t>|<\/a:t>/g, ""))
        .join(" ")
        .trim();

      const slideNum = key.match(/\d+/)?. [0] || "0";
      if (text) {
        slideTexts.push(`## Slide ${slideNum}\n${text}`);
      }
    }

    if (slideTexts.length === 0) {
      throw new Error("Could not extract any slide content from PowerPoint presentation.");
    }

    return slideTexts.join("\n\n");
  }

  // EPUB (.epub)
  if (fileName.endsWith(".epub")) {
    const files = unzipInMemory(fileBuffer);
    const chapters: string[] = [];

    const htmlKeys = Object.keys(files)
      .filter((k) => k.endsWith(".html") || k.endsWith(".xhtml") || k.endsWith(".htm"))
      .sort();

    for (const key of htmlKeys) {
      const html = files[key].toString("utf8");
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 50) {
        chapters.push(`## Chapter: ${key.split("/").pop()?.replace(/\.[^.]+$/, "")}\n${text}`);
      }
    }

    if (chapters.length === 0) {
      throw new Error("Could not extract any chapter text from EPUB file.");
    }

    return chapters.join("\n\n");
  }

  // Audio / Video files → Whisper
  if (
    fileName.endsWith(".mp3") ||
    fileName.endsWith(".wav") ||
    fileName.endsWith(".webm") ||
    fileName.endsWith(".m4a") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mov")
  ) {
    const fileToTranscribe = fileName.endsWith(".mov")
      ? new File([fileBuffer], "video.mp4", { type: "video/mp4" })
      : file;

    const transcription = await openai.audio.transcriptions.create({
      file: fileToTranscribe,
      model: "whisper-1",
    });
    return transcription.text;
  }

  // XLSX / XLS / CSV → xlsx parser
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      lines.push(`## Sheet: ${sheetName}\n${csv}`);
    }
    return lines.join("\n\n");
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}
