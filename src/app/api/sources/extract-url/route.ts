import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // Increased to 60s for deep extraction/fallback

export async function POST(req: NextRequest) {
  try {
    let { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    url = url.trim();
    // Prepend https:// if missing a protocol
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    // Validate URL format
    try { new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Improved YouTube detection (handles shorts, live, mobile, and secondary params)
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      const videoId = ytMatch[1];
      console.log(`[ExtractURL] YouTube detected: ${videoId}`);
      try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);

        // Convert transcript segments into timestamped text blocks
        const text = transcript
          .map((t: any) => {
            const minutes = Math.floor(t.offset / 60000);
            const seconds = Math.floor((t.offset % 60000) / 1000);
            const timestamp = `[${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}]`;
            return `${timestamp} ${t.text}`;
          })
          .join("\n");

        console.log(`[ExtractURL] YouTube transcript fetched with timestamps: ${text.substring(0, 150)}...`);
        return NextResponse.json({ text, type: "youtube", title: `YouTube: ${videoId}` });
      } catch (err: any) {
        console.warn(`[ExtractURL] YouTube transcript fetch failed for ${videoId}, falling back to OpenAI:`, err.message);
        try {
          const { openai } = await import("@/agents/core/openai-client");
          const completion = await openai.chat.completions.create({
            model: "gpt-5.4",
            messages: [
              { role: "system", content: "You are an AI research assistant. Provide a highly detailed summary and breakdown of the contents of the provided YouTube video URL. Extract any known key points, segments, or factual information available about this specific video based on its ID/URL." },
              { role: "user", content: `Please transcribe or summarize the contents of this YouTube video: ${url}` }
            ]
          });
          const fallbackText = completion.choices[0]?.message?.content || "Could not retrieve summary via fallback.";
          return NextResponse.json({
            text: fallbackText + "\n\n[Note: This is an AI-generated summary as the exact transcript was unavailable.]",
            type: "youtube",
            title: `YouTube: ${videoId}`
          });
        } catch (fallbackErr: any) {
          console.error("[ExtractURL] OpenAI fallback also failed:", fallbackErr);
          return NextResponse.json({
            error: `Could not retrieve transcript or summary for this YouTube video. ${fallbackErr.message}`
          }, { status: 400 });
        }
      }
    }

    // Regular URL → fetch HTML with 20s timeout
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 20_000);

    let html = "";
    try {
      console.log(`[ExtractURL] Fetching website: ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WorkspaceIQ-Bot/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        signal: abortCtrl.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`[ExtractURL] Site responded with ${res.status}: ${url}`);
        return NextResponse.json({ error: `Site responded with ${res.status}. The page may be private or restricted.` }, { status: 400 });
      }
      html = await res.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        console.error(`[ExtractURL] Timeout fetching ${url}`);
        return NextResponse.json({ error: "Request timed out. The site took too long to respond." }, { status: 408 });
      }
      console.error(`[ExtractURL] Fetch error for ${url}:`, fetchErr);
      throw fetchErr;
    }

    // Extract proper page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 120)
      : url;

    // HTML to text — strip scripts, styles, tags
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000); // Cap at ~50k chars to avoid token overflow

    console.log(`[ExtractURL] Successfully extracted text from ${url} (${text.length} chars)`);
    return NextResponse.json({ text, type: "website", title: pageTitle });

  } catch (error: any) {
    console.error("[ExtractURL] Global error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
