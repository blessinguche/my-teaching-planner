import JSZip from "jszip";

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wordValue(text: string) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  if (lines.length <= 1) return escapeXml(lines[0] ?? "");
  return lines
    .map((line, i) => {
      const esc = escapeXml(line);
      if (i === 0) return esc;
      return `</w:t><w:br/><w:t xml:space="preserve">${esc}`;
    })
    .join("");
}

export function applyPlaceholders(
  xml: string,
  values: Record<string, string>,
) {
  let out = xml;
  for (const [key, raw] of Object.entries(values)) {
    out = out.split(`{{${key}}}`).join(wordValue(raw));
  }
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fillDocxTemplate(
  templateUrl: string,
  values: Record<string, string>,
  filename: string,
) {
  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error(`Could not load template (${templateUrl}).`);
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const xmlPath = "word/document.xml";
  const xml = await zip.file(xmlPath)?.async("string");
  if (!xml) throw new Error("Template document.xml is missing.");
  zip.file(xmlPath, applyPlaceholders(xml, values));
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  triggerDownload(blob, filename);
}

export function safeDocName(parts: string[]) {
  return parts
    .filter(Boolean)
    .join(" — ")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .slice(0, 120);
}
