import { fillDocxTemplate, safeDocName } from "./docxPlaceholders";
import type { MeetingNote } from "./types";

const TEMPLATE_URL = "/templates/niot-observation-of-others.docx";

export async function exportObservationDocx(note: MeetingNote) {
  const values: Record<string, string> = {
    obsTeacher: note.observed,
    obsClass: note.subjectYear,
    obsDate: note.date,
    obsTopic: note.topic || note.outline || "",
    focus1: note.focusArea1 || note.focus || "",
    strategies1: note.strategies1 || note.wentWell || "",
    outcomes1: note.outcomes1 || note.impact || "",
    comments1: note.comments1 || note.develop1 || "",
    focus2: note.focusArea2 || "",
    strategies2: note.strategies2 || note.develop2 || "",
    outcomes2: note.outcomes2 || note.develop3 || "",
    comments2: note.comments2 || "",
  };

  await fillDocxTemplate(
    TEMPLATE_URL,
    values,
    `${safeDocName([
      "Observation of others",
      note.observed || "teacher",
      note.date,
    ])}.docx`,
  );
}
