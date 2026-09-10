import { useState } from "react";
import { Link } from "react-router-dom";
import { AddDialog } from "../components/AddDialog";
import { PaperPage, Sheet } from "../components/PlannerUI";
import { CLAYTON_PERIODS } from "../data/schools";
import { useStore } from "../data/store";

export function SchoolsPage() {
  const { data, addSchool } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <PaperPage
      title="Schools"
      caption="Placements · lesson planning, roster, attendance, timetable"
      actions={
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          + School
        </button>
      }
    >
      <Sheet className="stackable-table schools-table">
        <div className="planner-bar soft schools-table-head">
          <span>School</span>
          <span>Year</span>
          <span>Setup</span>
          <span>Open planner</span>
        </div>
        <div className="planner-grid joined">
          {data.schools.length === 0 ? (
            <div className="planner-row schools-table-empty">
              <div className="planner-cell" style={{ padding: "0.65rem" }}>
                <span className="muted">
                  Create a school to unlock lesson planning, roster, attendance and
                  timetable pages.
                </span>
              </div>
            </div>
          ) : (
            data.schools.map((school) => (
              <div key={school.id} className="planner-row schools-table-row">
                <div className="planner-cell schools-table-cell" data-label="School">
                  <strong>{school.name}</strong>
                  {school.startNotes ? (
                    <p className="hint">{school.startNotes}</p>
                  ) : null}
                </div>
                <div className="planner-cell schools-table-cell" data-label="Year">
                  {school.academicYear}
                </div>
                <div className="planner-cell schools-table-cell" data-label="Setup">
                  {school.terms.length} terms · {school.periods.length} periods
                </div>
                <div
                  className="planner-cell schools-table-cell schools-table-action"
                  data-label="Open planner"
                >
                  <Link className="btn" to={`/school/${school.id}`}>
                    Open planner
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Sheet>

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
    </PaperPage>
  );
}
