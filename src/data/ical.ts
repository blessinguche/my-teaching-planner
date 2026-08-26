import type { AssessmentItem, PlannerEvent } from "./types";

function icsEscape(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function toIcalDay(iso: string) {
  return iso.replace(/-/g, "");
}

function toIcalLocal(isoDate: string, hm: string) {
  const [h, m] = hm.split(":").map(Number);
  const clean = `${isoDate.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
  return clean;
}

function addOneDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function buildIcs(options: {
  events: PlannerEvent[];
  assessments: AssessmentItem[];
  calendarName?: string;
}) {
  const name = options.calendarName ?? "QTS Planner";
  const now = stamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QTS Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(name)}`,
  ];

  for (const ev of options.events) {
    const isAllDay =
      ev.kind === "personal" ||
      ev.start === "00:00" ||
      (ev.kind === "deadline" && ev.start === "23:59");
    const endDate = ev.endDate ?? ev.date;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@qts-planner.local`);
    lines.push(`DTSTAMP:${now}`);
    if (isAllDay || ev.kind === "deadline") {
      lines.push(`DTSTART;VALUE=DATE:${toIcalDay(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcalDay(addOneDay(endDate))}`);
    } else {
      lines.push(`DTSTART:${toIcalLocal(ev.date, ev.start)}`);
      lines.push(`DTEND:${toIcalLocal(endDate, ev.end)}`);
    }
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.detail) lines.push(`DESCRIPTION:${icsEscape(ev.detail)}`);
    if (ev.kind === "deadline" || ev.isAssessment) {
      lines.push("CATEGORIES:DEADLINE");
    } else if (ev.module === "Break" || /half term|break|holiday|easter|christmas/i.test(ev.title)) {
      lines.push("CATEGORIES:BREAK");
    }
    lines.push("END:VEVENT");
  }

  for (const a of options.assessments) {
    if (a.done) continue;
    const end = a.endDate ?? a.date;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${a.id}@qts-planner.local`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcalDay(a.date)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcalDay(addOneDay(end))}`);
    lines.push(`SUMMARY:${icsEscape(`⚠ ${a.title}`)}`);
    lines.push(
      `DESCRIPTION:${icsEscape(`[${a.type}] ${a.description} · Who: ${a.who}`)}`,
    );
    lines.push("CATEGORIES:ASSESSMENT,DEADLINE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
