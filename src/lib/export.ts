import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver"; // Need file-saver for browser saving of docx

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

  md += `\n*Produced with WorkSpaceIQ*`;
  return md;
}

/**
 * Generates a professional PDF with headers and structured content
 */
export async function downloadPDF(project: ProjectData) {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(30, 115, 232); // Blue primary
  doc.text("WorkSpaceIQ Intelligence Brief", 105, y, { align: "center" });
  y += 15;

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, y, { align: "center" });
  y += 20;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(project.title, 20, y);
  y += 15;

  // Content
  doc.setFontSize(12);
  const addText = (text: string, size = 12, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    const splitText = doc.splitTextToSize(text, 170);
    if (y + (splitText.length * 7) > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(splitText, 20, y);
    y += (splitText.length * 7) + 5;
  };

  addText(`Sources: ${project.sources.length}`, 14, true);
  
  project.sources.forEach((s, i) => {
    addText(`Source ${i+1}: ${s.title}`, 12, true);
    addText(s.text.substring(0, 500) + (s.text.length > 500 ? "..." : ""), 10);
  });

  if (project.deepDiveTranscript) {
    addText("Chancellor & Sydney Podcast Script", 14, true);
    addText(project.deepDiveTranscript, 10);
  }

  doc.save(`${project.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

/**
 * Generates a professional DOCX document
 */
export async function downloadDOCX(project: ProjectData) {
  const sections = [];

  // Title Section
  sections.push(
    new Paragraph({
      text: "WorkSpaceIQ Intelligence Brief",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    })
  );

  // Sources
  sections.push(new Paragraph({ text: `Sources: ${project.sources.length}`, heading: HeadingLevel.HEADING_2 }));
  project.sources.forEach((s, i) => {
    sections.push(
      new Paragraph({ text: `Source ${i+1}: ${s.title}`, heading: HeadingLevel.HEADING_3 }),
      new Paragraph({ text: s.text, spacing: { after: 200 } })
    );
  });

  if (project.deepDiveTranscript) {
    sections.push(
      new Paragraph({ text: "Chancellor & Sydney Podcast Script", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: project.deepDiveTranscript })
    );
  }

  const docBlob = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(docBlob);
  saveAs(blob, `${project.title.toLowerCase().replace(/\s+/g, "-")}.docx`);
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
