import JSZip from "jszip";
import type { LessonPlan, LessonSequenceRow } from "./types";

const TEMPLATE_URL = "/templates/niot-lesson-plan-proforma.docx";

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Put multiline values into a single Word text run with line breaks. */
function wordValue(text: string) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  if (lines.length <= 1) return escapeXml(lines[0] ?? "");
  // Split across <w:br/> inside the same run by replacing the whole {{ph}} occurrence
  // which sits inside <w:t>...</w:t>. Break the run for newlines.
  return lines
    .map((line, i) => {
      const esc = escapeXml(line);
      if (i === 0) return esc;
      return `</w:t><w:br/><w:t xml:space="preserve">${esc}`;
    })
    .join("");
}

function phaseJoined(plan: LessonPlan, phase: LessonSequenceRow["phase"]) {
  const matches = plan.sequence.filter((r) => r.phase === phase);
  if (matches.length === 0) return { time: "", teacher: "", learners: "" };
  if (matches.length === 1) {
    const m = matches[0]!;
    return { time: m.time, teacher: m.teacher, learners: m.learners };
  }
  return {
    time: matches.map((m) => m.time).filter(Boolean).join(" / "),
    teacher: matches
      .map((m) => [m.heading, m.teacher].filter(Boolean).join("\n"))
      .filter(Boolean)
      .join("\n\n"),
    learners: matches
      .map((m) => m.learners)
      .filter(Boolean)
      .join("\n\n"),
  };
}

function buildReplacements(plan: LessonPlan): Record<string, string> {
  const entrance = phaseJoined(plan, "entrance");
  const intro = phaseJoined(plan, "introduction");
  const input = phaseJoined(plan, "input");
  const checkpoint = phaseJoined(plan, "checkpoint");
  const plenary = phaseJoined(plan, "plenary");
  const extras = plan.sequence.filter((r) => r.phase === "other");
  const extraBlock = extras
    .map((r) =>
      ["Additional phase", r.heading, r.time && `Time: ${r.time}`, r.teacher, r.learners]
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");

  return {
    teacher: plan.teacher,
    date: plan.date,
    teachingGroup: plan.teachingGroup,
    title: plan.title,
    objectives: plan.objectives,
    review: plan.review,
    startingFrom: plan.startingFrom,
    endGoal: plan.endGoal,
    coreKnowledge: plan.coreKnowledge,
    checkpointCheck: plan.checkpointCheck,
    misconceptions: plan.misconceptions,
    findMisconceptions: plan.findMisconceptions,
    vocabulary: plan.vocabulary,
    mentorFocus: plan.mentorFocus,
    entranceTime: entrance.time,
    entranceTeacher: entrance.teacher,
    entranceLearners: entrance.learners,
    introTime: intro.time,
    introTeacher: intro.teacher,
    introLearners: intro.learners,
    inputTime: input.time,
    inputTeacher: input.teacher,
    inputLearners: input.learners,
    checkpointTeacher: [checkpoint.time && `Time: ${checkpoint.time}`, checkpoint.teacher]
      .filter(Boolean)
      .join("\n"),
    checkpointLearners: checkpoint.learners,
    plenaryTime: plenary.time,
    plenaryTeacher: [plenary.teacher, extraBlock].filter(Boolean).join("\n\n"),
    plenaryLearners: plenary.learners,
  };
}

function applyPlaceholders(xml: string, values: Record<string, string>) {
  let out = xml;
  for (const [key, raw] of Object.entries(values)) {
    const token = `{{${key}}}`;
    out = out.split(token).join(wordValue(raw));
  }
  // Clear any leftover tokens
  out = out.replace(/\{\{[a-zA-Z]+\}\}/g, "");
  return out;
}

function safeFileName(plan: LessonPlan) {
  const base = (plan.title || "lesson-plan")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 80);
  return `NIoT lesson plan — ${base || "untitled"} — ${plan.date || "draft"}.docx`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fill the official NIoT Word proforma and download it. */
export async function exportLessonPlanDocx(plan: LessonPlan) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error("Could not load the NIoT lesson plan template.");
  }
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const xmlPath = "word/document.xml";
  const xml = await zip.file(xmlPath)?.async("string");
  if (!xml) throw new Error("Template document.xml is missing.");

  zip.file(xmlPath, applyPlaceholders(xml, buildReplacements(plan)));
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  triggerDownload(blob, safeFileName(plan));
}
