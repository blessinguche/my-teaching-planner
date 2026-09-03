import { useState } from "react";
import { Link } from "react-router-dom";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import { CLAYTON_PERIODS } from "../data/schools";
import { useStore } from "../data/store";

export function SchoolsPage() {
  const { data, addSchool } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Placements & schools"
        title="Schools"
        blurb="Create a school to unlock lesson planning, roster, attendance, timetable and the rest of the teaching pages."
        actions={<AddButton label="School" onClick={() => setOpen(true)} />}
      />

      <div className="planner-stack">
        {data.schools.map((school) => (
          <section key={school.id} className="panel clay-panel">
            <div className="day-sheet-head">
              <div>
                <h2>{school.name}</h2>
                <p className="hint">
                  {school.academicYear} · {school.terms.length} terms ·{" "}
                  {school.periods.length} periods
                </p>
              </div>
              <Link className="btn btn-primary btn-clay" to={`/school/${school.id}`}>
                Open planner
              </Link>
            </div>
            {school.startNotes ? (
              <p className="muted" style={{ marginTop: "0.75rem" }}>
                {school.startNotes}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <AddDialog
        open={open}
        title="Create a school"
        description="Adds a blank school planner. Periods start from a secondary template you can edit later."
        fields={[
          { name: "name", label: "School name", required: true },
          {
            name: "shortName",
            label: "Short name",
            required: true,
            placeholder: "e.g. Clayton Hall",
          },
          {
            name: "academicYear",
            label: "Academic year",
            defaultValue: "2026–27",
          },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) => {
          addSchool({
            name: v.name,
            shortName: v.shortName,
            academicYear: v.academicYear || "2026–27",
            periods: CLAYTON_PERIODS.map((p) => ({ ...p, id: `${p.id}-${Date.now()}` })),
            terms: [],
            closures: [],
          });
        }}
      />
    </div>
  );
}
