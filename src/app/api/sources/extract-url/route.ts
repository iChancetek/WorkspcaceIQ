import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    // Improved YouTube detection (handles shorts, live, mobile, and secondary params)
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
    
    if (ytMatch) {
      try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(ytMatch[1]);
        const text = transcript.map((t: any) => t.text).join(" ");
        return NextResponse.json({ text, type: "youtube", title: `YouTube: ${ytMatch[1]}` });
      } catch (err: any) {
        console.warn("YouTube transcript fetch failed, falling back to OpenAI:", err);
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
            title: `YouTube: ${ytMatch[1]}` 
          });
        } catch (fallbackErr: any) {
           console.error("OpenAI fallback also failed:", fallbackErr);
           return NextResponse.json({ 
             error: "This YouTube video has no accessible transcript, and the AI fallback failed. Please try a different video or an article." 
           }, { status: 400 });
        }
      }
    }

    // Regular URL → fetch HTML → strip tags
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    
    // Simple but effective HTML-to-text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000); // Cap at ~50k chars to avoid token overflow

    return NextResponse.json({ text, type: "website", title: url });
    
  } catch (error: any) {
    console.error("URL extraction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
