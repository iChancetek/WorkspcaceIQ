"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";

interface DataDashboardProps {
  sources: Source[];
  tone: string;
}

type Persona = "ceo" | "manager" | "analyst";

interface PersonaBriefing {
  title: string;
  summary: string;
  kpis?: { label: string; value: string; trend: "up" | "down" | "stable" }[];
  actions?: string[];
  insights?: string[];
}

interface DashboardData {
  ceo: PersonaBriefing;
  manager: PersonaBriefing;
  analyst: PersonaBriefing;
}

const PERSONA_CONFIG: Record<Persona, { label: string; color: string; bg: string; border: string }> = {
  ceo: { label: "CEO View", color: "text-amber-400", bg: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/25" },
  manager: { label: "Manager View", color: "text-blue-400", bg: "from-blue-500/15 to-blue-600/5", border: "border-blue-500/25" },
  analyst: { label: "Analyst View", color: "text-violet-400", bg: "from-violet-500/15 to-violet-600/5", border: "border-violet-500/25" },
};

const CHART_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#facc15"];

function parseSpreadsheetToChartData(text: string): { chartData: any[]; headers: string[] } {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return { chartData: [], headers: [] };

  // Try to find the first CSV-like section
  const csvStart = lines.findIndex(l => l.includes(","));
  if (csvStart === -1) return { chartData: [], headers: [] };

  const headerLine = lines[csvStart];
  const headers = headerLine.split(",").map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(csvStart + 1, csvStart + 15); // max 14 data rows for readability

  const chartData = rows.map(row => {
    const values = row.split(",").map(v => v.trim().replace(/"/g, ""));
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const num = parseFloat(values[i]);
      obj[h] = isNaN(num) ? values[i] : num;
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== "" && v !== undefined));

  return { chartData, headers };
}

export function DataDashboard({ sources, tone }: DataDashboardProps) {
  const [persona, setPersona] = useState<Persona>("ceo");
  const [isLoading, setIsLoading] = useState(false);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const spreadsheetSources = sources.filter(s => s.type === "spreadsheet");

  // Auto-generate when spreadsheet sources are added
  useEffect(() => {
    if (spreadsheetSources.length > 0 && !dashData) {
      generateDashboard();
    }
  }, [spreadsheetSources.length]);

  const generateDashboard = async () => {
    if (!sources.length) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: sources.map(s => ({ title: s.title, text: s.text })),
          mode: "dashboard",
          tone,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDashData(data.data);
    } catch (err: any) {
      setError("Failed to generate dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const { chartData, headers } = spreadsheetSources.length > 0
    ? parseSpreadsheetToChartData(spreadsheetSources[0].text)
    : { chartData: [], headers: [] };

  const numericHeaders = headers.filter((h, i) =>
    chartData.some(row => typeof row[h] === "number")
  );
  const labelHeader = headers.find(h => chartData.every(row => typeof row[h] === "string")) || headers[0];

  const currentPersona = PERSONA_CONFIG[persona];
  const currentBriefing = dashData?.[persona];

  const TrendIcon = ({ trend }: { trend: string }) =>
    trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> :
    trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> :
    <Minus className="w-3.5 h-3.5 text-white/40" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Data Dashboard</p>
            <p className="text-[10px] text-white/70">AI-powered analytics from your spreadsheet</p>
          </div>
        </div>
        <button
          onClick={generateDashboard}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/50 hover:text-white transition-all"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Persona selector */}
      <div className="flex gap-2">
        {(["ceo", "manager", "analyst"] as Persona[]).map(p => (
          <button
            key={p}
            onClick={() => setPersona(p)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all",
              persona === p
                ? cn("bg-white text-black shadow-lg", PERSONA_CONFIG[p].border)
                : "border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            {PERSONA_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* AI Briefing */}
      <div className={cn("p-5 rounded-2xl border bg-gradient-to-br", currentPersona.bg, currentPersona.border)}>
        {isLoading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className={cn("w-5 h-5 animate-spin", currentPersona.color)} />
            <p className="text-sm text-white/50">Generating {currentPersona.label} briefing...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : currentBriefing ? (
          <div className="space-y-4">
            <p className={cn("text-xs font-bold uppercase tracking-widest", currentPersona.color)}>{currentBriefing.title}</p>
            <p className="text-sm text-white/80 leading-relaxed">{currentBriefing.summary}</p>

            {/* KPIs (CEO) */}
            {currentBriefing.kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {currentBriefing.kpis.map((kpi, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/8">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-white/60 font-medium">{kpi.label}</p>
                      <TrendIcon trend={kpi.trend} />
                    </div>
                    <p className={cn("text-lg font-black", currentPersona.color)}>{kpi.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions (Manager) */}
            {currentBriefing.actions && (
              <ul className="space-y-1.5 mt-2">
                {currentBriefing.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <span className={cn("font-bold mt-0.5", currentPersona.color)}>→</span>
                    {action}
                  </li>
                ))}
              </ul>
            )}

            {/* Insights (Analyst) */}
            {currentBriefing.insights && (
              <ul className="space-y-1.5 mt-2">
                {currentBriefing.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <span className={cn("font-bold mt-0.5", currentPersona.color)}>{i + 1}.</span>
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-white/60">Add a spreadsheet source to generate your briefing.</p>
          </div>
        )}
      </div>

      {/* Charts */}
      {chartData.length > 1 && numericHeaders.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/25">Data Visualization</p>

          {/* Bar Chart */}
          <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
            <p className="text-xs font-bold text-white/50 mb-4">Bar Chart — {numericHeaders[0]}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey={labelHeader} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "12px" }} />
                {numericHeaders.slice(0, 3).map((h, i) => (
                  <Bar key={h} dataKey={h} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart (if multiple numeric columns) */}
          {numericHeaders.length > 1 && (
            <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
              <p className="text-xs font-bold text-white/50 mb-4">Trend — {numericHeaders.slice(0, 2).join(" vs ")}</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={labelHeader} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }} />
                  {numericHeaders.slice(0, 2).map((h, i) => (
                    <Line key={h} type="monotone" dataKey={h} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ fill: CHART_COLORS[i], r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Chart (if one label + one numeric column) */}
          {numericHeaders.length >= 1 && chartData.length <= 8 && (
            <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
              <p className="text-xs font-bold text-white/50 mb-4">Distribution — {numericHeaders[0]}</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey={numericHeaders[0]}
                    nameKey={labelHeader}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
