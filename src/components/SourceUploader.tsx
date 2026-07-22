"use client";

import { useState, useRef } from "react";
import { Upload, Link2, Loader2, FileText, Globe, Video, Music, X, AlertCircle, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractDocumentText } from "@/actions/document";
import { useAuth } from "@/context/AuthContext";

export interface Source {
  id: string;
  title: string;
  text: string;
  type: "pdf" | "docx" | "txt" | "audio" | "youtube" | "website" | "spreadsheet" | "video";
}

interface SourceUploaderProps {
  sources: Source[];
  onSourcesChange: (sources: Source[]) => void;
  maxSources?: number;
}

export function SourceUploader({ sources, onSourcesChange, maxSources = 25 }: SourceUploaderProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerIngest = async (id: string, title: string, type: string, text: string) => {
    if (!user) return;
    try {
      fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          userId: user.uid,
          title,
          type,
          text,
        }),
      }).catch(console.warn);
    } catch (e) {
      console.warn("Background ingestion trigger failed", e);
    }
  };

  const triggerDelete = async (id: string) => {
    if (!user) return;
    try {
      fetch("/api/knowledge/ingest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          sourceId: id,
        }),
      }).catch(console.warn);
    } catch (e) {
      console.warn("Background delete trigger failed", e);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (sources.length >= maxSources) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      if (sources.length >= maxSources) break;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const text = await extractDocumentText(formData);
        
        const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
        const typeMap: Record<string, Source["type"]> = {
          pdf: "pdf", docx: "docx", txt: "txt",
          mp3: "audio", wav: "audio", webm: "audio", m4a: "audio",
          mp4: "video", mov: "video",
          xlsx: "spreadsheet", xls: "spreadsheet", csv: "spreadsheet",
        };

        const generatedId = crypto.randomUUID();
        const type = typeMap[ext] || "txt";
        onSourcesChange([
          ...sources,
          {
            id: generatedId,
            title: file.name,
            text,
            type,
          },
        ]);
        triggerIngest(generatedId, file.name, type, text);
      } catch (err) {
        console.error("File processing error:", err);
      }
    }
    setIsUploading(false);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim() || sources.length >= maxSources) return;
    setIsExtractingUrl(true);
    setError("");

    // Detect Google Sheets / CSV export URLs
    const isSheetsCsv = urlInput.includes("docs.google.com") || urlInput.endsWith(".csv");

    try {
      if (isSheetsCsv) {
        // Directly fetch the CSV
        const csvRes = await fetch(urlInput);
        if (!csvRes.ok) throw new Error("Could not fetch the spreadsheet. Make sure it is published to the web.");
        const csv = await csvRes.text();
        const generatedId = crypto.randomUUID();
        const title = urlInput.includes("docs.google.com") ? "Google Sheet" : urlInput.split("/").pop() || "Spreadsheet";
        onSourcesChange([
          ...sources,
          {
            id: generatedId,
            title,
            text: csv,
            type: "spreadsheet",
          },
        ]);
        triggerIngest(generatedId, title, "spreadsheet", csv);
        setUrlInput("");
      } else {
      const res = await fetch("/api/sources/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.text) {
        const generatedId = crypto.randomUUID();
        const title = data.title || urlInput;
        const type = data.type === "youtube" ? "youtube" : "website";
        onSourcesChange([
          ...sources,
          {
            id: generatedId,
            title,
            text: data.text,
            type,
          },
        ]);
        triggerIngest(generatedId, title, type, data.text);
        setUrlInput("");
      } else if (data.error) {
        setError(data.error);
      }
      } // end isSheetsCsv else block
    } catch (err) {
      console.error("URL extraction error:", err);
      setError("Failed to extract content from this URL. Please ensure it is publicly accessible.");
    }
    setIsExtractingUrl(false);
  };

  const removeSource = (id: string) => {
    onSourcesChange(sources.filter((s) => s.id !== id));
    triggerDelete(id);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    pdf: <FileText className="w-4 h-4 text-red-500" />,
    docx: <FileText className="w-4 h-4 text-blue-500" />,
    txt: <FileText className="w-4 h-4 text-foreground/50" />,
    audio: <Music className="w-4 h-4 text-purple-500" />,
    video: <Video className="w-4 h-4 text-purple-500" />,
    youtube: <Video className="w-4 h-4 text-red-500" />,
    website: <Globe className="w-4 h-4 text-green-500" />,
    spreadsheet: <Table2 className="w-4 h-4 text-emerald-500" />,
  };

  return (
    <div className="space-y-4 w-full items-stretch">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all w-full max-w-full bg-white dark:bg-[#1e1a4d] shadow-md dark:shadow-xl",
          dragActive
            ? "border-blue-500 bg-blue-50/50 dark:border-cyan-400 dark:bg-cyan-500/10 ring-4 ring-cyan-500/10"
            : "border-blue-200 dark:border-cyan-500/30 hover:border-blue-500 dark:hover:border-cyan-400 hover:bg-blue-50/30 dark:hover:bg-cyan-500/5",
          sources.length >= maxSources && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.mp3,.wav,.webm,.m4a,.mp4,.mov,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-cyan-400 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-blue-600 dark:text-cyan-400" />
          )}
          <div>
            <p className="text-sm font-bold text-foreground dark:text-white">
              {isUploading ? "Processing..." : "Drop files here or click to upload"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-foreground/60 dark:text-cyan-200/70 mt-1 font-bold">
              PDF · DOCX · TXT · MP3 · WAV · MP4 · MOV · XLSX · CSV
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-[11px] font-medium bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* URL Extractor */}
      <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1e1a4d] border border-blue-200 dark:border-cyan-500/30 p-1.5 focus-within:border-blue-500 dark:focus-within:border-cyan-400 shadow-md transition-all">
        <div className="flex items-center gap-2 flex-1 px-3">
          <Link2 className="w-4 h-4 text-foreground/40 dark:text-cyan-400 shrink-0" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="Paste website or YouTube URL..."
            className="w-full bg-transparent border-none text-xs font-semibold text-foreground dark:text-white focus:outline-none placeholder:text-foreground/40 dark:placeholder:text-indigo-200/50"
          />
        </div>
        <button
          onClick={handleUrlSubmit}
          disabled={isExtractingUrl || !urlInput.trim()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white border border-blue-500 dark:border-cyan-400 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 dark:shadow-cyan-500/20"
        >
          {isExtractingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </button>
      </div>

      {/* Source cards */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-foreground/70 dark:text-white/70 text-center sm:text-left">
            {sources.length} / {maxSources} Sources
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-start gap-3 p-4 bg-card dark:bg-white/[0.04] border border-border dark:border-white/8 rounded-xl group hover:shadow-md transition-all"
              >
                <div className="p-2 bg-foreground/5 dark:bg-white/5 rounded-lg shrink-0 mt-0.5">
                  {typeIcons[source.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground dark:text-white/90 truncate">{source.title}</p>
                  <p className="text-[10px] text-foreground/70 dark:text-white/75 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                    {source.text.substring(0, 120)}...
                  </p>
                </div>
                <button
                  onClick={() => removeSource(source.id)}
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                >
                  <X className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
