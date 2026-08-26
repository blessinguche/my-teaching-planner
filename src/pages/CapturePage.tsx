import { useEffect, useRef, useState } from "react";
import { AddDialog, PageHeader } from "../components/AddDialog";
import { CaptureAudioPlayer } from "../components/CaptureAudioPlayer";
import { putBlob } from "../data/fileStore";
import {
  speechSupported,
  startLiveTranscript,
  type LiveTranscriptSession,
} from "../data/speech";
import { useStore } from "../data/store";
import type { CaptureItem } from "../data/types";

type Mode = "hub" | "note" | "record";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

export function CapturePage() {
  const { data, addCapture, updateCapture, deleteCapture, addTask } =
    useStore();
  const [mode, setMode] = useState<Mode>("hub");
  const [editing, setEditing] = useState<CaptureItem | null>(null);
  const [listeningId, setListeningId] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [permissionOk, setPermissionOk] = useState(false);
  const [context, setContext] = useState("Mentor meeting");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<LiveTranscriptSession | null>(null);
  const liveRef = useRef("");
  const mimeRef = useRef("audio/webm");

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      speechRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    if (!permissionOk) {
      setStatus("Confirm authorised recording first.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      mimeRef.current = pickMime();
      const recorder = new MediaRecorder(stream, { mimeType: mimeRef.current });
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      setLiveTranscript("");
      liveRef.current = "";

      if (speechSupported()) {
        speechRef.current = startLiveTranscript(
          (text) => {
            liveRef.current = text;
            setLiveTranscript(text);
          },
          () => {
            setStatus(
              (s) =>
                s ||
                "Recording audio. Live transcript unavailable — you can edit it after.",
            );
          },
        );
        setStatus("Recording + live transcript… Stop when finished.");
      } else {
        speechRef.current = null;
        setStatus(
          "Recording audio (this browser can’t auto-transcribe — edit transcript after).",
        );
      }

      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setStatus("Could not access microphone. Check browser permissions.");
    }
  }

  async function stopRecording() {
    if (saving) return;
    setSaving(true);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalsFromSpeech = speechRef.current?.stop() ?? "";
    speechRef.current = null;
    const transcript = (finalsFromSpeech || liveRef.current).trim();

    const recorder = mediaRef.current;
    mediaRef.current = null;

    const blob = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(
          chunksRef.current.length
            ? new Blob(chunksRef.current, { type: mimeRef.current })
            : null,
        );
        return;
      }
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const b =
          chunksRef.current.length > 0
            ? new Blob(chunksRef.current, {
                type: recorder.mimeType || mimeRef.current,
              })
            : null;
        chunksRef.current = [];
        resolve(b);
      };
      recorder.stop();
    });

    setRecording(false);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const title = `${context} · ${mins}m ${secs}s`;

    let audioFileId: string | undefined;
    try {
      if (blob && blob.size > 0) {
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const meta = await putBlob(
          blob,
          `capture-${Date.now()}.${ext}`,
          blob.type || mimeRef.current,
        );
        audioFileId = meta.id;
      }
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Could not save audio file.",
      );
      setSaving(false);
      return;
    }

    addCapture({
      kind: "recording",
      title,
      body: transcript
        ? "Recording saved. Transcript generated live from audio — edit if needed."
        : "Recording saved. Add or fix the transcript below.",
      context,
      permissionConfirmed: true,
      transcript,
      audioFileId,
    });

    setStatus(
      audioFileId
        ? "Saved with audio + transcript. Use Listen on the card to replay."
        : "Saved note (no audio blob captured).",
    );
    setLiveTranscript("");
    setMode("hub");
    setSaving(false);
  }

  function saveNote() {
    if (!noteTitle.trim() && !noteBody.trim()) return;
    addCapture({
      kind: "note",
      title: noteTitle.trim() || "Quick note",
      body: noteBody.trim(),
    });
    setNoteTitle("");
    setNoteBody("");
    setMode("hub");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Operational capture"
        title="Capture"
        blurb="Notes, tasks, and authorised recordings — audio is kept; tap Listen to replay."
        actions={
          mode === "hub" ? (
            <>
              <button type="button" className="btn" onClick={() => setMode("note")}>
                + Note
              </button>
              <button
                type="button"
                className="btn btn-primary btn-clay"
                onClick={() => setMode("record")}
              >
                Record
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setMode("hub")}>
              Back
            </button>
          )
        }
      />

      {mode === "hub" ? (
        <>
          <div className="action-tile-grid">
            <button
              type="button"
              className="action-tile action-tile--mint"
              onClick={() => setMode("note")}
            >
              <span className="action-tile-kicker">Write</span>
              <h3>Quick note</h3>
              <p>Mentor gems, placement thoughts, rough ops notes.</p>
            </button>
            <button
              type="button"
              className="action-tile action-tile--peach"
              onClick={() => setMode("record")}
            >
              <span className="action-tile-kicker">Audio</span>
              <h3>Authorised record</h3>
              <p>Permission first. Keeps audio + live transcript.</p>
            </button>
            <button
              type="button"
              className="action-tile action-tile--sky"
              onClick={() => {
                const label = window.prompt("Task to add?");
                if (label?.trim()) addTask({ label: label.trim() });
              }}
            >
              <span className="action-tile-kicker">Do</span>
              <h3>Quick task</h3>
              <p>Park an action without leaving Capture.</p>
            </button>
          </div>

          <h2 className="section-label">Recent captures</h2>
          <ul className="todo-page-list">
            {data.captures.map((c) => {
              const openPlayer = listeningId === c.id;
              return (
                <li key={c.id} className="panel todo-page-item capture-row">
                  <div className="capture-row-main">
                    <button
                      type="button"
                      className="todo-page-main as-button"
                      onClick={() => setEditing(c)}
                    >
                      <strong>
                        {c.kind === "recording" ? "🎙 " : "✎ "}
                        {c.title}
                      </strong>
                      <p className="hint">{formatWhen(c.updatedAt)}</p>
                      <p className="hint notes-preview">
                        {(c.transcript || c.body).slice(0, 140)}
                        {(c.transcript || c.body).length > 140 ? "…" : ""}
                      </p>
                    </button>
                    <div className="capture-row-actions">
                      {c.audioFileId ? (
                        <button
                          type="button"
                          className={`btn btn-clay${openPlayer ? " btn-primary" : " btn-peach"}`}
                          onClick={() =>
                            setListeningId((id) => (id === c.id ? null : c.id))
                          }
                        >
                          {openPlayer ? "Hide" : "Listen"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setEditing(c)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  {openPlayer && c.audioFileId ? (
                    <div className="capture-inline-player">
                      <CaptureAudioPlayer fileId={c.audioFileId} />
                    </div>
                  ) : null}
                </li>
              );
            })}
            {data.captures.length === 0 ? (
              <p className="muted">No captures yet.</p>
            ) : null}
          </ul>
        </>
      ) : null}

      {mode === "note" ? (
        <section className="panel clay-panel" style={{ maxWidth: 640 }}>
          <h2 className="panel-title">Quick note</h2>
          <label className="field">
            <span>Title</span>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Mentor meeting · Day 2"
            />
          </label>
          <label className="field" style={{ marginTop: "0.75rem" }}>
            <span>Notes</span>
            <textarea
              className="clay-textarea"
              rows={8}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Key points, actions, questions…"
            />
          </label>
          <button
            type="button"
            className="btn btn-primary btn-clay"
            onClick={saveNote}
          >
            Save note
          </button>
        </section>
      ) : null}

      {mode === "record" ? (
        <section className="panel clay-panel" style={{ maxWidth: 640 }}>
          <h2 className="panel-title">Authorised recording</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Only use where you have permission. Classroom recordings involving
            pupils need school/provider approval. Audio is kept; use Listen on
            the card to replay. Transcript is generated while you record
            (Chrome / Edge work best).
          </p>

          <label className="check-row">
            <input
              type="checkbox"
              checked={permissionOk}
              onChange={(e) => setPermissionOk(e.target.checked)}
              disabled={recording || saving}
            />
            <span>I confirm this recording is authorised for this context.</span>
          </label>

          <label className="field" style={{ marginTop: "0.85rem" }}>
            <span>Context</span>
            <select
              value={context}
              disabled={recording || saving}
              onChange={(e) => setContext(e.target.value)}
            >
              <option>Mentor meeting</option>
              <option>Training / ITAP session</option>
              <option>Self practice / rehearsal</option>
              <option>Other authorised session</option>
            </select>
          </label>

          <div className="record-status">
            <div className={`record-dot${recording ? " live" : ""}`} aria-hidden />
            <span className="record-timer">
              {recording ? `${mm}:${ss}` : "Ready"}
            </span>
          </div>

          {(recording || liveTranscript) && (
            <div className="live-transcript clay-sunken">
              <p className="section-label">Live transcript</p>
              <p className="recall-answer">
                {liveTranscript || "Listening…"}
              </p>
            </div>
          )}

          {!recording ? (
            <button
              type="button"
              className="btn btn-peach btn-clay"
              onClick={startRecording}
              disabled={!permissionOk || saving}
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-clay"
              onClick={stopRecording}
              disabled={saving}
            >
              {saving ? "Saving…" : "Stop & save"}
            </button>
          )}

          {status ? (
            <p className="hint" style={{ marginTop: "0.85rem" }}>
              {status}
            </p>
          ) : null}
        </section>
      ) : null}

      <AddDialog
        open={!!editing}
        formKey={editing?.id}
        title="Edit capture"
        submitLabel="Save"
        description={
          editing?.audioFileId
            ? "Play the recording below, then edit notes / transcript."
            : undefined
        }
        fields={[
          {
            name: "title",
            label: "Title",
            required: true,
            defaultValue: editing?.title,
          },
          {
            name: "body",
            label: "Notes",
            type: "textarea",
            defaultValue: editing?.body,
          },
          {
            name: "transcript",
            label: "Transcript (from audio)",
            type: "textarea",
            defaultValue: editing?.transcript ?? "",
            placeholder: "Generated while recording — edit for accuracy…",
            hint: "Built from the live speech recognition stream. Fix names / jargon here.",
          },
        ]}
        onClose={() => setEditing(null)}
        onDelete={editing ? () => deleteCapture(editing.id) : undefined}
        onSubmit={(v) => {
          if (!editing) return;
          updateCapture(editing.id, {
            title: v.title,
            body: v.body || "",
            transcript: v.transcript || "",
          });
        }}
      >
        {editing?.audioFileId ? (
          <div className="capture-audio-block">
            <p className="section-label">Listen</p>
            <CaptureAudioPlayer fileId={editing.audioFileId} />
          </div>
        ) : null}
      </AddDialog>
    </div>
  );
}
