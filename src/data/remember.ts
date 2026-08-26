import type { AppData } from "./types";

/** Stable daily rotation across pinned reminders + glossary gems */
export function getRememberOfDay(data: AppData, d = new Date()): string {
  const gems: string[] = [];

  for (const r of data.reminders) {
    if (r.text.trim()) gems.push(r.text.trim());
  }

  for (const g of data.glossary) {
    if (g.inPractice[0]) {
      gems.push(`${g.term}: ${g.inPractice[0]}`);
    } else if (g.definition) {
      gems.push(`${g.term}: ${g.definition}`);
    }
  }

  if (gems.length === 0) {
    return "Add a reminder or glossary gem to rotate here.";
  }

  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return gems[dayOfYear % gems.length];
}
