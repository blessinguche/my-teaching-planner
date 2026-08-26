import { useMemo, useState } from "react";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import {
  formatFileSize,
  MAX_UPLOAD_BYTES,
  openStoredFile,
  putFile,
  deleteStoredFile,
} from "../data/fileStore";
import { useStore } from "../data/store";
import type { ResourceLink } from "../data/types";

const labels = {
  qts: "QTS",
  computing: "Computing",
  reading: "Reading",
  other: "Other",
} as const;

const categoryField = {
  name: "category",
  label: "Category",
  type: "select" as const,
  options: [
    { value: "qts", label: "QTS" },
    { value: "computing", label: "Computing" },
    { value: "reading", label: "Reading" },
    { value: "other", label: "Other" },
  ],
};

const fileHint = `Upload a PDF/DOCX/etc. (max ${formatFileSize(MAX_UPLOAD_BYTES)}). Stored in this app — not a folder path.`;

export function ResourcesPage() {
  const { data, addResource, updateResource, deleteResource } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceLink | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const order = ["qts", "computing", "reading", "other"] as const;
    return order
      .map((cat) => ({
        cat,
        items: data.resources.filter((r) => r.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [data.resources]);

  async function handleOpenFile(fileId: string) {
    setOpenError(null);
    try {
      await openStoredFile(fileId);
    } catch (err) {
      setOpenError(
        err instanceof Error ? err.message : "Could not open file.",
      );
    }
  }

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Link library"
        title="Resources"
        blurb="Add a URL and/or upload a file. Uploads live in the app vault — no Dropbox path required."
        actions={<AddButton label="Resource" onClick={() => setAddOpen(true)} />}
      />

      {openError ? <p className="form-error">{openError}</p> : null}

      <div className="resource-stack">
        {grouped.map(({ cat, items }) => (
          <section key={cat}>
            <h2 className="section-label">{labels[cat]}</h2>
            <div className="resource-grid">
              {items.map((r) => (
                <article
                  key={r.id}
                  className="resource-card clickable"
                  onClick={() => setEditing(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditing(r);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <h3>{r.name}</h3>
                  <p className="muted">{r.description}</p>
                  {r.file ? (
                    <p className="hint">
                      📎 {r.file.name} · {formatFileSize(r.file.size)}
                    </p>
                  ) : null}
                  {r.notes ? (
                    <p className="hint notes-preview">{r.notes}</p>
                  ) : null}
                  <div
                    className="resource-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.url ? (
                      <a
                        className="btn btn-primary btn-clay"
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open link
                      </a>
                    ) : null}
                    {r.file ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-clay"
                        onClick={() => handleOpenFile(r.file!.id)}
                      >
                        Open file
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditing(r)}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <AddDialog
        open={addOpen}
        title="Add resource"
        description="Paste a URL, upload a file, or both."
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "url", label: "URL", type: "url" },
          {
            name: "upload",
            label: "Upload file",
            type: "file",
            accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,image/*",
            hint: fileHint,
          },
          { ...categoryField },
          { name: "description", label: "Description", type: "textarea" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setAddOpen(false)}
        onSubmit={async (v, files) => {
          const upload = files.upload;
          let file: ResourceLink["file"];
          if (upload) {
            const meta = await putFile(upload);
            file = {
              id: meta.id,
              name: meta.name,
              mime: meta.mime,
              size: meta.size,
            };
          }
          if (!v.url && !file) {
            throw new Error("Add a URL or upload a file.");
          }
          addResource({
            name: v.name,
            url: v.url || undefined,
            file,
            category: (v.category || "other") as ResourceLink["category"],
            description: v.description,
            notes: v.notes,
          });
        }}
      />

      <AddDialog
        open={!!editing}
        formKey={editing?.id}
        title="Edit resource"
        submitLabel="Save"
        description={
          editing?.file
            ? `Current file: ${editing.file.name}. Choose a new file to replace it.`
            : undefined
        }
        fields={[
          {
            name: "name",
            label: "Name",
            required: true,
            defaultValue: editing?.name,
          },
          {
            name: "url",
            label: "URL",
            type: "url",
            defaultValue: editing?.url ?? "",
          },
          {
            name: "upload",
            label: editing?.file ? "Replace file" : "Upload file",
            type: "file",
            accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,image/*",
            hint: fileHint,
          },
          {
            ...categoryField,
            defaultValue: editing?.category,
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: editing?.description,
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: editing?.notes ?? "",
          },
          ...(editing?.file
            ? [
                {
                  name: "clearFile",
                  label: "Uploaded file",
                  type: "select" as const,
                  defaultValue: "keep",
                  options: [
                    { value: "keep", label: "Keep current file" },
                    { value: "clear", label: "Remove uploaded file" },
                  ],
                },
              ]
            : []),
        ]}
        onClose={() => setEditing(null)}
        onDelete={editing ? () => deleteResource(editing.id) : undefined}
        onSubmit={async (v, files) => {
          if (!editing) return;
          const upload = files.upload;
          let nextFile = editing.file;
          const clear = v.clearFile === "clear";

          if (upload) {
            const meta = await putFile(upload);
            if (editing.file?.id) {
              try {
                await deleteStoredFile(editing.file.id);
              } catch {
                /* replace anyway */
              }
            }
            nextFile = {
              id: meta.id,
              name: meta.name,
              mime: meta.mime,
              size: meta.size,
            };
          } else if (clear && editing.file) {
            try {
              await deleteStoredFile(editing.file.id);
            } catch {
              /* ignore */
            }
            nextFile = undefined;
          }

          const url = v.url || undefined;
          if (!url && !nextFile && !editing.localPath) {
            throw new Error("Keep a URL or an uploaded file.");
          }

          updateResource(editing.id, {
            name: v.name,
            url,
            file: nextFile,
            localPath: nextFile ? undefined : editing.localPath,
            category: v.category as ResourceLink["category"],
            description: v.description || "",
            notes: v.notes || "",
          });
        }}
      />
    </div>
  );
}
