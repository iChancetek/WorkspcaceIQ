import { Source } from "@/components/SourceUploader";

interface ProjectData {
  title: string;
  sources: Source[];
  studioOutputs?: Record<string, any>;
  deepDiveTranscript?: string;
  createdAt: string;
}

export function generateProjectMarkdown(project: ProjectData): string {
  let md = `# Research Project: ${project.title}\n`;
  md += `*Generated on: ${new Date(project.createdAt).toLocaleString()}*\n\n`;

  md += `## Sources (${project.sources.length})\n\n`;
  project.sources.forEach((source, i) => {
    md += `### Source ${i + 1}: ${source.title}\n`;
    md += `**Type**: ${source.type.toUpperCase()}\n\n`;
    md += `${source.text}\n\n`;
    md += `---\n\n`;
  });

  if (project.deepDiveTranscript) {
    md += `## Deep Dive Podcast Transcript\n\n`;
    md += project.deepDiveTranscript + "\n\n";
    md += `---\n\n`;
  }

  if (project.studioOutputs && Object.keys(project.studioOutputs).length > 0) {
    md += `## Studio Analysis Outputs\n\n`;
    Object.entries(project.studioOutputs).forEach(([mode, content]) => {
      md += `### Mode: ${mode.toUpperCase()}\n\n`;
      if (typeof content === "string") {
        md += content + "\n\n";
      } else {
        md += "```json\n" + JSON.stringify(content, null, 2) + "\n```\n\n";
      }
    });
  }

  md += `\n*Produced with WorkspaceIQ*`;
  return md;
}

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
