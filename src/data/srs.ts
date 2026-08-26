import type {
  AppData,
  ReviewCard,
  SrsCardProgress,
  SrsRating,
} from "./types";
import { addDays, todayISO } from "./dates";

export function defaultSrsProgress(due = todayISO()): SrsCardProgress {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due,
  };
}

/** Simplified SM-2 (Anki-style) scheduling */
export function scheduleAfterReview(
  prev: SrsCardProgress | undefined,
  rating: SrsRating,
  today = todayISO(),
): SrsCardProgress {
  const current = prev ?? defaultSrsProgress(today);
  let { ease, interval, repetitions } = current;

  if (rating === 1) {
    repetitions = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (repetitions === 0) {
      interval = rating === 2 ? 1 : rating === 3 ? 1 : 3;
    } else if (repetitions === 1) {
      interval = rating === 2 ? 3 : rating === 3 ? 6 : 8;
    } else {
      const factor =
        rating === 2 ? Math.max(1.2, ease - 0.15) : rating === 4 ? ease * 1.3 : ease;
      interval = Math.max(1, Math.round(interval * factor));
    }
    repetitions += 1;
    if (rating === 2) ease = Math.max(1.3, ease - 0.15);
    if (rating === 4) ease += 0.15;
  }

  return {
    ease: Math.round(ease * 100) / 100,
    interval,
    repetitions,
    due: addDays(today, interval),
    lastReviewed: today,
  };
}

export function buildReviewDeck(data: AppData): ReviewCard[] {
  const cards: ReviewCard[] = [];

  for (const g of data.glossary) {
    cards.push({
      id: `glossary:${g.id}:define`,
      mode: "define",
      label: "Definition",
      prompt: `What is “${g.term}”?`,
      answer: g.definition,
    });
    cards.push({
      id: `glossary:${g.id}:why`,
      mode: "why",
      label: "Why it matters",
      prompt: `Why does “${g.term}” matter in the classroom?`,
      answer: g.whyItMatters,
    });
    if (g.inPractice.length > 0) {
      cards.push({
        id: `glossary:${g.id}:practice`,
        mode: "practice",
        label: "In practice",
        prompt: `Give examples of how you would practise “${g.term}”.`,
        answer: g.inPractice.map((line) => `• ${line}`).join("\n"),
      });
    }
  }

  for (const a of data.acronyms) {
    cards.push({
      id: `acronym:${a.id}:expand`,
      mode: "acronym-expand",
      label: "Acronym → meaning",
      prompt: `What does ${a.acronym} stand for?`,
      answer: a.meaning,
    });
    cards.push({
      id: `acronym:${a.id}:recall`,
      mode: "acronym-recall",
      label: "Meaning → acronym",
      prompt: `Which acronym means: “${a.meaning}”?`,
      answer: a.acronym,
    });
  }

  return cards;
}

export function isDue(progress: SrsCardProgress, today = todayISO()): boolean {
  return progress.due <= today;
}

export function getDueCards(data: AppData, today = todayISO()): ReviewCard[] {
  const deck = buildReviewDeck(data);
  return deck
    .filter((card) => {
      const progress = data.srs[card.id];
      if (!progress) return true;
      return isDue(progress, today);
    })
    .sort((a, b) => {
      const pa = data.srs[a.id];
      const pb = data.srs[b.id];
      if (!pa && pb) return -1;
      if (pa && !pb) return 1;
      if (!pa && !pb) return a.id.localeCompare(b.id);
      const dueCmp = (pa!.due || "").localeCompare(pb!.due || "");
      if (dueCmp !== 0) return dueCmp;
      return pa!.repetitions - pb!.repetitions;
    });
}

export function countDue(data: AppData, today = todayISO()) {
  return getDueCards(data, today).length;
}

export function countNew(data: AppData) {
  const deck = buildReviewDeck(data);
  return deck.filter((c) => !data.srs[c.id]).length;
}
