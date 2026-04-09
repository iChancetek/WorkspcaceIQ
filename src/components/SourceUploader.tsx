"use client";

import { useState, useRef } from "react";
import { Upload, Link, Loader2, FileText, Globe, Video, Music, X, AlertCircle, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractDocumentText } from "@/actions/document";

export interface Source {
  id: string;
  title: string;
  text: string;
  type: "pdf" | "docx" | "txt" | "audio" | "youtube" | "website" | "spreadsheet";
}

interface SourceUploaderProps {
  sources: Source[];
  onSourcesChange: (sources: Source[]) => void;
  maxSources?: number;
}

export function SourceUploader({ sources, onSourcesChange, maxSources = 10 }: SourceUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          xlsx: "spreadsheet", xls: "spreadsheet", csv: "spreadsheet",
        };

        onSourcesChange([
          ...sources,
          {
            id: crypto.randomUUID(),
            title: file.name,
            text,
            type: typeMap[ext] || "txt",
          },
        ]);
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
        onSourcesChange([
          ...sources,
          {
            id: crypto.randomUUID(),
            title: urlInput.includes("docs.google.com") ? "Google Sheet" : urlInput.split("/").pop() || "Spreadsheet",
            text: csv,
            type: "spreadsheet",
          },
        ]);
        setUrlInput("");
      } else {
      const res = await fetch("/api/sources/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.text) {
        onSourcesChange([
          ...sources,
          {
            id: crypto.randomUUID(),
            title: data.title || urlInput,
            text: data.text,
            type: data.type === "youtube" ? "youtube" : "website",
          },
        ]);
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
  };

  const typeIcons: Record<string, React.ReactNode> = {
    pdf: <FileText className="w-4 h-4 text-red-500" />,
    docx: <FileText className="w-4 h-4 text-blue-500" />,
    txt: <FileText className="w-4 h-4 text-foreground/50" />,
    audio: <Music className="w-4 h-4 text-purple-500" />,
    youtube: <Video className="w-4 h-4 text-red-500" />,
    website: <Globe className="w-4 h-4 text-green-500" />,
    spreadsheet: <Table2 className="w-4 h-4 text-emerald-500" />,
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
          dragActive
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-black/10 hover:border-black/20 hover:bg-secondary/30"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.mp3,.wav,.webm,.m4a,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-white/50" />
          )}
          <div>
            <p className="text-sm font-semibold text-white/80">
              {isUploading ? "Processing..." : "Drop files here or click to upload"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">
              PDF · DOCX · TXT · MP3 · WAV · XLSX · CSV
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

      {/* URL input */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/8 rounded-xl backdrop-blur-sm">
          <Link className="w-4 h-4 text-white/40 shrink-0" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="Paste a website or YouTube URL..."
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <button
          onClick={handleUrlSubmit}
          disabled={isExtractingUrl || !urlInput.trim()}
          className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isExtractingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </button>
      </div>

      {/* Source cards */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">
            {sources.length} / {maxSources} Sources
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-start gap-3 p-4 bg-white/60 border border-black/5 rounded-xl group hover:shadow-md transition-all"
              >
                <div className="p-2 bg-secondary/50 rounded-lg shrink-0 mt-0.5">
                  {typeIcons[source.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary/90 truncate">{source.title}</p>
                  <p className="text-[10px] text-black/60 mt-0.5 line-clamp-2">
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
