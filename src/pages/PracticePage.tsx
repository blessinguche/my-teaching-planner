import { useMemo, useState } from "react";
import { PageHeader } from "../components/AddDialog";
import {
  buildReviewDeck,
  countDue,
  countNew,
  getDueCards,
} from "../data/srs";
import { useStore } from "../data/store";
import type { ReviewCard, SrsRating } from "../data/types";

type Phase = "prompt" | "reveal";
type BrowseSet =
  | "due"
  | "define"
  | "why"
  | "practice"
  | "acronym-expand"
  | "acronym-recall";

const SESSION_CAP = 20;

const SETS: {
  id: BrowseSet;
  title: string;
  blurb: string;
  tone: "mint" | "peach" | "sky" | "butter" | "ink" | "lilac";
}[] = [
  {
    id: "due",
    title: "Due today",
    blurb: "Everything spaced repetition says is due now (incl. new).",
    tone: "peach",
  },
  {
    id: "define",
    title: "Definitions",
    blurb: "What is…? Glossary term → definition.",
    tone: "mint",
  },
  {
    id: "why",
    title: "Why it matters",
    blurb: "Why does this matter in the classroom?",
    tone: "sky",
  },
  {
    id: "practice",
    title: "In practice",
    blurb: "Give examples of how you would practise this.",
    tone: "butter",
  },
  {
    id: "acronym-expand",
    title: "Acronym → meaning",
    blurb: "What does FSM / EAL / SEND stand for?",
    tone: "lilac",
  },
  {
    id: "acronym-recall",
    title: "Meaning → acronym",
    blurb: "Which acronym means…?",
    tone: "ink",
  },
];

function cardsForSet(data: ReturnType<typeof useStore>["data"], set: BrowseSet) {
  if (set === "due") return getDueCards(data);
  return buildReviewDeck(data).filter((c) => c.mode === set);
}

export function PracticePage() {
  const { data, reviewCard } = useStore();
  const [browseSet, setBrowseSet] = useState<BrowseSet | null>(null);
  const [session, setSession] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [draft, setDraft] = useState("");
  const [reviewed, setReviewed] = useState(0);
  const [againQueue, setAgainQueue] = useState<ReviewCard[]>([]);

  const dueCount = countDue(data);
  const newCount = countNew(data);
  const deck = useMemo(() => buildReviewDeck(data), [data]);

  const setCounts = useMemo(() => {
    const map: Record<BrowseSet, number> = {
      due: dueCount,
      define: 0,
      why: 0,
      practice: 0,
      "acronym-expand": 0,
      "acronym-recall": 0,
    };
    for (const c of deck) {
      if (c.mode in map) map[c.mode as BrowseSet] += 1;
    }
    return map;
  }, [deck, dueCount]);

  const browseCards = useMemo(
    () => (browseSet ? cardsForSet(data, browseSet) : []),
    [browseSet, data],
  );

  const current = session?.[index] ?? null;

  function startSession(cards: ReviewCard[]) {
    setSession(cards.slice(0, SESSION_CAP));
    setIndex(0);
    setPhase("prompt");
    setDraft("");
    setReviewed(0);
    setAgainQueue([]);
    setBrowseSet(null);
  }

  function advance(nextAgain: ReviewCard[]) {
    const nextIndex = index + 1;
    if (session && nextIndex < session.length) {
      setIndex(nextIndex);
      setPhase("prompt");
      setDraft("");
      setAgainQueue(nextAgain);
      return;
    }
    if (nextAgain.length > 0) {
      setSession(nextAgain);
      setIndex(0);
      setPhase("prompt");
      setDraft("");
      setAgainQueue([]);
      return;
    }
    setSession([]);
    setAgainQueue([]);
    setPhase("prompt");
    setDraft("");
  }

  function rate(rating: SrsRating) {
    if (!current) return;
    reviewCard(current.id, rating);
    setReviewed((n) => n + 1);
    const nextAgain = rating === 1 ? [...againQueue, current] : againQueue;
    advance(nextAgain);
  }

  if (session && session.length === 0) {
    return (
      <div className="module-page page-enter">
        <PageHeader
          eyebrow="Active recall · SRS"
          title="Session done"
          blurb={`You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}.`}
        />
        <div className="clay-panel empty-state">
          <div className="glyph" aria-hidden>
            ✓
          </div>
          <h2>Nice work</h2>
          <button
            type="button"
            className="btn btn-primary btn-clay"
            onClick={() => setSession(null)}
          >
            Back to practice
          </button>
        </div>
      </div>
    );
  }

  if (session && current) {
    return (
      <div className="module-page page-enter">
        <header className="page-head practice-session-head">
          <div>
            <p className="eyebrow">{current.label}</p>
            <h1>Recall</h1>
            <p className="muted">
              Card {index + 1} of {session.length}
              {againQueue.length > 0 ? ` · ${againQueue.length} to retry` : ""}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setSession(null)}>
            End
          </button>
        </header>

        <article className="clay-panel recall-card">
          <p className="section-label">Prompt</p>
          <h2 className="recall-prompt">{current.prompt}</h2>

          {phase === "prompt" ? (
            <>
              <label className="recall-label" htmlFor="recall-draft">
                Type what you remember (optional)
              </label>
              <textarea
                id="recall-draft"
                className="clay-textarea"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Don’t peek — retrieve it first…"
              />
              <button
                type="button"
                className="btn btn-primary btn-clay"
                onClick={() => setPhase("reveal")}
              >
                Show answer
              </button>
            </>
          ) : (
            <>
              {draft.trim() ? (
                <div className="clay-sunken recall-yours">
                  <p className="section-label">Your recall</p>
                  <p className="recall-answer">{draft}</p>
                </div>
              ) : null}
              <div className="clay-sunken recall-model">
                <p className="section-label">Model answer</p>
                <p className="recall-answer">{current.answer}</p>
              </div>
              <p className="hint" style={{ marginBottom: "0.75rem" }}>
                How well did you retrieve it?
              </p>
              <div className="rating-row">
                <button type="button" className="clay-btn rating again" onClick={() => rate(1)}>
                  Again<span>soon</span>
                </button>
                <button type="button" className="clay-btn rating hard" onClick={() => rate(2)}>
                  Hard<span>~1–3d</span>
                </button>
                <button type="button" className="clay-btn rating good" onClick={() => rate(3)}>
                  Good<span>longer</span>
                </button>
                <button type="button" className="clay-btn rating easy" onClick={() => rate(4)}>
                  Easy<span>furthest</span>
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    );
  }

  if (browseSet) {
    const meta = SETS.find((s) => s.id === browseSet)!;
    return (
      <div className="module-page page-enter">
        <PageHeader
          eyebrow="Card set"
          title={meta.title}
          blurb="Questions only — no answers shown here. Start a session to practise."
          actions={
            <>
              <button type="button" className="btn" onClick={() => setBrowseSet(null)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-clay"
                disabled={browseCards.length === 0}
                onClick={() => startSession(browseCards)}
              >
                Start session ({Math.min(SESSION_CAP, browseCards.length)})
              </button>
            </>
          }
        />
        <ol className="prompt-list">
          {browseCards.map((card, i) => (
            <li key={card.id} className="panel prompt-row">
              <span className="prompt-index">{i + 1}</span>
              <div>
                <p className="hint">{card.label}</p>
                <strong>{card.prompt}</strong>
              </div>
            </li>
          ))}
        </ol>
        {browseCards.length === 0 ? (
          <p className="muted">No cards in this set yet.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Active recall · spaced repetition"
        title="Practice"
        blurb="Open a set to browse questions, then start a recall session."
      />

      <div className="dash-grid" style={{ marginBottom: "1.25rem" }}>
        <section className="clay-panel span-4">
          <div className="learn-badge">{dueCount}</div>
          <p className="muted">due today</p>
        </section>
        <section className="clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--peach)" }}>
            {newCount}
          </div>
          <p className="muted">never reviewed</p>
        </section>
        <section className="clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--sky)" }}>
            {Object.keys(data.srs).length}
          </div>
          <p className="muted">with history</p>
        </section>
      </div>

      <div className="action-tile-grid">
        {SETS.map((set) => (
          <button
            key={set.id}
            type="button"
            className={`action-tile action-tile--${set.tone}`}
            onClick={() => setBrowseSet(set.id)}
          >
            <span className="action-tile-kicker">
              {setCounts[set.id]} cards
            </span>
            <h3>{set.title}</h3>
            <p>{set.blurb}</p>
            <span className="action-tile-cta">View questions →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
