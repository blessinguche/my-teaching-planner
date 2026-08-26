import { useMemo, useState } from "react";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import { useStore } from "../data/store";
import type { Acronym, GlossaryEntry } from "../data/types";

type Tab = "glossary" | "acronyms";

export function KnowledgePage() {
  const {
    data,
    addGlossary,
    updateGlossary,
    deleteGlossary,
    addAcronym,
    updateAcronym,
    deleteAcronym,
  } = useStore();
  const [tab, setTab] = useState<Tab>("glossary");
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editGloss, setEditGloss] = useState<GlossaryEntry | null>(null);
  const [editAcr, setEditAcr] = useState<Acronym | null>(null);

  const q = query.trim().toLowerCase();

  const glossary = useMemo(() => {
    return data.glossary.filter((g) => {
      if (!q) return true;
      return (
        g.term.toLowerCase().includes(q) ||
        g.definition.toLowerCase().includes(q) ||
        g.source.toLowerCase().includes(q) ||
        g.tags.some((t) => t.includes(q)) ||
        (g.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.glossary, q]);

  const acronyms = useMemo(() => {
    return data.acronyms.filter((a) => {
      const matchesQuery =
        !q ||
        a.acronym.toLowerCase().includes(q) ||
        a.meaning.toLowerCase().includes(q) ||
        (a.notes ?? "").toLowerCase().includes(q);
      const matchesLetter =
        letter === "all" || a.acronym.toUpperCase().startsWith(letter);
      return matchesQuery && matchesLetter;
    });
  }, [data.acronyms, q, letter]);

  const letters = useMemo(() => {
    const set = new Set(
      data.acronyms.map(
        (a) => a.acronym.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase(),
      ),
    );
    return [...set].filter(Boolean).sort();
  }, [data.acronyms]);

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Knowledge base"
        title="Learn"
        blurb="Click any concept or acronym to edit. Source shows where each idea comes from."
        actions={
          <AddButton
            label={tab === "glossary" ? "Concept" : "Acronym"}
            onClick={() => setAddOpen(true)}
          />
        }
      />

      <div className="toolbar-row">
        <div className="tab-row" role="tablist">
          <button
            type="button"
            className={`btn${tab === "glossary" ? " btn-primary btn-clay" : ""}`}
            onClick={() => setTab("glossary")}
          >
            Glossary ({data.glossary.length})
          </button>
          <button
            type="button"
            className={`btn${tab === "acronyms" ? " btn-primary btn-clay" : ""}`}
            onClick={() => setTab("acronyms")}
          >
            Acronyms ({data.acronyms.length})
          </button>
        </div>
        <input
          className="clay-input"
          type="search"
          placeholder={tab === "glossary" ? "Search concepts…" : "Search acronyms…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {tab === "glossary" ? (
        <div className="glossary-list">
          {glossary.map((entry) => {
            const open = openId === entry.id;
            return (
              <article key={entry.id} className={`glossary-card${open ? " open" : ""}`}>
                <button
                  type="button"
                  className="glossary-toggle"
                  onClick={() =>
                    setOpenId((id) => (id === entry.id ? null : entry.id))
                  }
                >
                  <h2>{entry.term}</h2>
                  <span className="hint">{open ? "Hide" : "Show"}</span>
                </button>
                <p className="muted">{entry.definition}</p>
                {entry.source ? (
                  <p className="hint" style={{ marginTop: "0.35rem" }}>
                    Source: {entry.source}
                  </p>
                ) : null}
                {open ? (
                  <div className="glossary-body">
                    <h3>Why it matters</h3>
                    <p>{entry.whyItMatters}</p>
                    <h3>In practice</h3>
                    <ul className="bullet-list">
                      {entry.inPractice.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    {entry.notes ? (
                      <>
                        <h3>Your notes</h3>
                        <p>{entry.notes}</p>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: "0.75rem" }}
                      onClick={() => setEditGloss(entry)}
                    >
                      Edit
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {glossary.length === 0 ? (
            <p className="muted">No concepts match that search.</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="letter-rail" aria-label="Jump by letter">
            <button
              type="button"
              className={`letter-chip${letter === "all" ? " active" : ""}`}
              onClick={() => setLetter("all")}
            >
              All
            </button>
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                className={`letter-chip${letter === l ? " active" : ""}`}
                onClick={() => setLetter(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="acronym-grid">
            {acronyms.map((a) => (
              <button
                key={a.id}
                type="button"
                className="acronym-row as-button clickable"
                onClick={() => setEditAcr(a)}
              >
                <span className="acronym-code">{a.acronym}</span>
                <span>
                  {a.meaning}
                  {a.notes ? (
                    <span className="hint notes-preview">{a.notes}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          {acronyms.length === 0 ? (
            <p className="muted">No acronyms match.</p>
          ) : null}
        </>
      )}

      <AddDialog
        open={addOpen}
        title={tab === "glossary" ? "Add concept" : "Add acronym"}
        fields={
          tab === "glossary"
            ? [
                { name: "term", label: "Term", required: true },
                {
                  name: "definition",
                  label: "Definition",
                  type: "textarea",
                  required: true,
                },
                {
                  name: "whyItMatters",
                  label: "Why it matters",
                  type: "textarea",
                },
                {
                  name: "inPractice",
                  label: "In practice (one per line)",
                  type: "textarea",
                },
                {
                  name: "source",
                  label: "Source",
                  placeholder: "e.g. ITAP1 Handout 1.2.1",
                  hint: "Where this idea comes from (handbook, article, session).",
                },
                { name: "notes", label: "Notes", type: "textarea" },
              ]
            : [
                { name: "acronym", label: "Acronym", required: true },
                { name: "meaning", label: "Meaning", required: true },
                { name: "notes", label: "Notes", type: "textarea" },
              ]
        }
        onClose={() => setAddOpen(false)}
        onSubmit={(v) => {
          if (tab === "glossary") {
            addGlossary({
              term: v.term,
              definition: v.definition,
              whyItMatters: v.whyItMatters,
              inPractice: v.inPractice,
              source: v.source,
              notes: v.notes,
            });
          } else {
            addAcronym({
              acronym: v.acronym,
              meaning: v.meaning,
              notes: v.notes,
            });
          }
        }}
      />

      <AddDialog
        open={!!editGloss}
        formKey={editGloss?.id}
        title="Edit concept"
        submitLabel="Save"
        fields={[
          {
            name: "term",
            label: "Term",
            required: true,
            defaultValue: editGloss?.term,
          },
          {
            name: "definition",
            label: "Definition",
            type: "textarea",
            required: true,
            defaultValue: editGloss?.definition,
          },
          {
            name: "whyItMatters",
            label: "Why it matters",
            type: "textarea",
            defaultValue: editGloss?.whyItMatters,
          },
          {
            name: "inPractice",
            label: "In practice (one per line)",
            type: "textarea",
            defaultValue: editGloss?.inPractice.join("\n"),
          },
          {
            name: "source",
            label: "Source",
            defaultValue: editGloss?.source ?? "",
            placeholder: "e.g. ITAP1 Handout 1.2.1",
            hint: "Where this idea comes from (handbook, article, session).",
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: editGloss?.notes ?? "",
          },
        ]}
        onClose={() => setEditGloss(null)}
        onDelete={editGloss ? () => deleteGlossary(editGloss.id) : undefined}
        onSubmit={(v) => {
          if (!editGloss) return;
          updateGlossary(editGloss.id, {
            term: v.term,
            definition: v.definition,
            whyItMatters: v.whyItMatters || "",
            inPractice: v.inPractice
              ? v.inPractice
                  .split(/\n|;/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
            source: v.source || "Added by you",
            notes: v.notes || "",
          });
        }}
      />

      <AddDialog
        open={!!editAcr}
        formKey={editAcr?.id}
        title="Edit acronym"
        submitLabel="Save"
        fields={[
          {
            name: "acronym",
            label: "Acronym",
            required: true,
            defaultValue: editAcr?.acronym,
          },
          {
            name: "meaning",
            label: "Meaning",
            required: true,
            defaultValue: editAcr?.meaning,
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: editAcr?.notes ?? "",
          },
        ]}
        onClose={() => setEditAcr(null)}
        onDelete={editAcr ? () => deleteAcronym(editAcr.id) : undefined}
        onSubmit={(v) => {
          if (!editAcr) return;
          updateAcronym(editAcr.id, {
            acronym: v.acronym.toUpperCase(),
            meaning: v.meaning,
            notes: v.notes || "",
          });
        }}
      />
    </div>
  );
}
