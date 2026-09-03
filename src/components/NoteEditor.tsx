import { useEffect, useId, useRef, useState } from "react";
import { getFileRecord, putFile } from "../data/fileStore";
import { speechSupported, startLiveTranscript } from "../data/speech";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minHeight?: number;
};

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function isHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toEditableHtml(raw: string) {
  if (!raw) return "";
  if (isHtml(raw)) return raw;
  return raw
    .split(/\n+/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

export function sanitizeNoteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "MARK",
    "BR",
    "UL",
    "OL",
    "LI",
    "SPAN",
    "DIV",
  ]);

  const clean = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      const audioId = el.dataset.audioId;

      if (el.tagName === "DIV" && audioId) {
        const chip = document.createElement("div");
        chip.className = "note-audio-chip";
        chip.dataset.audioId = audioId;
        chip.textContent = "Voice note";
        el.replaceWith(chip);
        continue;
      }

      if (!allowed.has(el.tagName)) {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        el.remove();
        continue;
      }

      for (const attr of [...el.attributes]) {
        const keepMark = el.tagName === "MARK" && attr.name === "class";
        const keepDictate =
          el.tagName === "SPAN" && attr.name === "data-dictate-live";
        if (keepMark || keepDictate) continue;
        el.removeAttribute(attr.name);
      }
      if (el.tagName === "MARK") el.className = "note-highlight";
      clean(el);
    }
  };

  clean(doc.body);
  // unwrap live dictate markers on save
  doc.body.querySelectorAll("[data-dictate-live]").forEach((el) => {
    const text = document.createTextNode(el.textContent ?? "");
    el.replaceWith(text);
  });
  return doc.body.innerHTML.trim();
}

export function NoteEditor({
  name,
  defaultValue = "",
  placeholder,
  required,
  disabled,
  minHeight = 120,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dictationRef = useRef<ReturnType<typeof startLiveTranscript> | null>(
    null,
  );
  const baseTextRef = useRef("");
  const [dictating, setDictating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const labelId = useId();

  function syncHidden() {
    const el = editorRef.current;
    const hidden = hiddenRef.current;
    if (!el || !hidden) return;
    let html = sanitizeNoteHtml(el.innerHTML);
    if (html === "<p><br></p>" || html === "<br>" || html === "<p></p>") {
      html = "";
    }
    hidden.value = html;
  }

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = toEditableHtml(defaultValue) || "";
    syncHidden();
    return () => {
      dictationRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    };
    // seed once per mount (dialog formKey remounts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runFormat(action: () => void) {
    focusEditor();
    action();
    syncHidden();
  }

  function toggleDictate() {
    if (dictating) {
      const finalText = dictationRef.current?.stop() ?? "";
      dictationRef.current = null;
      setDictating(false);
      const el = editorRef.current;
      const live = el?.querySelector("[data-dictate-live]");
      if (live) {
        live.replaceWith(document.createTextNode(finalText || live.textContent || ""));
      }
      syncHidden();
      setStatus("");
      return;
    }
    if (!speechSupported()) {
      setStatus("Dictation needs Chrome or Edge.");
      return;
    }
    focusEditor();
    baseTextRef.current = "";
    const session = startLiveTranscript((text) => {
      const el = editorRef.current;
      if (!el) return;
      let live = el.querySelector("[data-dictate-live]") as HTMLElement | null;
      if (!live) {
        live = document.createElement("span");
        live.dataset.dictateLive = "1";
        const sel = window.getSelection();
        if (sel?.rangeCount) sel.getRangeAt(0).insertNode(live);
        else el.appendChild(live);
      }
      live.textContent = text;
      syncHidden();
    }, (err) => setStatus(err));
    if (!session) {
      setStatus("Could not start dictation.");
      return;
    }
    dictationRef.current = session;
    setDictating(true);
    setStatus("Listening…");
  }

  async function toggleRecord() {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 200) {
          setStatus("Recording too short.");
          return;
        }
        try {
          const file = new File([blob], `note-voice-${Date.now()}.webm`, {
            type: mime,
          });
          const meta = await putFile(file);
          const chip = document.createElement("div");
          chip.className = "note-audio-chip";
          chip.dataset.audioId = meta.id;
          chip.contentEditable = "false";
          chip.textContent = "Voice note";
          focusEditor();
          const sel = window.getSelection();
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0);
            range.collapse(false);
            range.insertNode(document.createElement("br"));
            range.insertNode(chip);
          } else {
            editorRef.current?.appendChild(chip);
          }
          syncHidden();
          setStatus("Voice note attached.");
        } catch (err) {
          setStatus(
            err instanceof Error ? err.message : "Could not save audio.",
          );
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus("Recording… tap Rec again to stop.");
    } catch {
      setStatus("Microphone permission needed.");
    }
  }

  return (
    <div className={`note-editor${disabled ? " is-disabled" : ""}`}>
      <div className="note-toolbar" role="toolbar" aria-label="Note formatting">
        <button
          type="button"
          className="note-tool"
          title="Heading"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runFormat(() => exec("formatBlock", "h2"))}
        >
          H
        </button>
        <button
          type="button"
          className="note-tool"
          title="Subheading"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runFormat(() => exec("formatBlock", "h3"))}
        >
          H2
        </button>
        <button
          type="button"
          className="note-tool"
          title="Body paragraph"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runFormat(() => exec("formatBlock", "p"))}
        >
          ¶
        </button>
        <button
          type="button"
          className="note-tool"
          title="Bold"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runFormat(() => exec("bold"))}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="note-tool"
          title="Highlight"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            runFormat(() => {
              try {
                exec("hiliteColor", "#ffe08a");
              } catch {
                exec("backColor", "#ffe08a");
              }
            })
          }
        >
          HL
        </button>
        <span className="note-tool-sep" aria-hidden />
        <button
          type="button"
          className={`note-tool${dictating ? " is-active" : ""}`}
          title="Dictate"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleDictate}
        >
          {dictating ? "Stop" : "Dictate"}
        </button>
        <button
          type="button"
          className={`note-tool${recording ? " is-recording" : ""}`}
          title="Record voice note"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void toggleRecord()}
        >
          {recording ? "■ Stop" : "● Rec"}
        </button>
      </div>
      <div
        id={labelId}
        ref={editorRef}
        className="note-surface"
        style={{ minHeight }}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline
        data-placeholder={placeholder ?? "Write notes…"}
        onInput={syncHidden}
        onBlur={syncHidden}
        suppressContentEditableWarning
      />
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        required={required}
        defaultValue={defaultValue}
      />
      {status ? <p className="field-hint">{status}</p> : null}
    </div>
  );
}

export function NoteHtmlLive({
  html,
  className,
  clamp,
}: {
  html?: string;
  className?: string;
  clamp?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const safe = html?.trim()
    ? isHtml(html)
      ? sanitizeNoteHtml(html)
      : `<p>${escapeHtml(html)}</p>`
    : "";

  useEffect(() => {
    const root = ref.current;
    if (!root || !safe) return;
    const chips = root.querySelectorAll<HTMLElement>("[data-audio-id]");
    const urls: string[] = [];
    chips.forEach((chip) => {
      const id = chip.dataset.audioId;
      if (!id) return;
      void getFileRecord(id).then((rec) => {
        if (!rec || !chip.isConnected) return;
        const url = URL.createObjectURL(rec.blob);
        urls.push(url);
        chip.replaceChildren();
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = url;
        chip.appendChild(audio);
      });
    });
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [safe]);

  if (!safe) return null;
  return (
    <div
      ref={ref}
      className={`note-html${clamp ? " is-clamp" : ""}${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field search-field">
      <span className="visually-hidden">Search</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder ?? "Search…"}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function StudentPicker({
  name,
  students,
  required,
  disabled,
  allowNone,
  noneLabel = "Whole class / none",
  defaultValue = "",
}: {
  name: string;
  students: { id: string; name: string; yearGroup?: string; form?: string }[];
  required?: boolean;
  disabled?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  defaultValue?: string;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(defaultValue);
  const filtered = students.filter((s) => {
    const hay = `${s.name} ${s.yearGroup ?? ""} ${s.form ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="student-picker">
      <input
        type="hidden"
        name={name}
        value={picked}
        required={required && !allowNone}
        readOnly
      />
      <SearchField value={q} onChange={setQ} placeholder="Search students…" />
      <div className="student-picker-list" role="listbox" aria-label="Students">
        {allowNone ? (
          <button
            type="button"
            className={`student-pick${picked === "" ? " is-selected" : ""}`}
            disabled={disabled}
            onClick={() => setPicked("")}
          >
            {noneLabel}
          </button>
        ) : null}
        {filtered.length === 0 ? (
          <p className="hint">No matches.</p>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`student-pick${picked === s.id ? " is-selected" : ""}`}
              disabled={disabled}
              onClick={() => setPicked(s.id)}
            >
              <strong>{s.name}</strong>
              <span className="hint">
                {[s.yearGroup, s.form].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
