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

const AUTOSAVE_MS = 3 * 60 * 1000; // every 3 minutes

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
  const { data, addCapture, updateCapture, addTask } = useStore();
  const [mode, setMode] = useState<Mode>("hub");
  const [editing, setEditing] = useState<CaptureItem | null>(null);
  const [listeningId, setListeningId] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [context, setContext] = useState("Mentor meeting");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastAutosave, setLastAutosave] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const autosaveRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<LiveTranscriptSession | null>(null);
  const liveRef = useRef("");
  const mimeRef = useRef("audio/webm");
  const draftIdRef = useRef<string | null>(null);
  const audioFileIdRef = useRef<string | undefined>(undefined);
  const secondsRef = useRef(0);
  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (autosaveRef.current) window.clearInterval(autosaveRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      speechRef.current?.stop();
    };
  }, []);

  async function persistDraft(partial: {
    title?: string;
    transcript?: string;
    body?: string;
    audioFileId?: string;
  }) {
    const id = draftIdRef.current;
    if (!id) return;
    updateCapture(id, {
      title: partial.title,
      transcript: partial.transcript,
      body: partial.body,
      audioFileId: partial.audioFileId,
      context: contextRef.current,
    });
  }

  async function snapshotAudio(): Promise<string | undefined> {
    const recorder = mediaRef.current;
    if (recorder && recorder.state === "recording") {
      await new Promise<void>((resolve) => {
        const onData = () => {
          recorder.removeEventListener("dataavailable", onData);
          resolve();
        };
        recorder.addEventListener("dataavailable", onData);
        recorder.requestData();
        window.setTimeout(() => {
          recorder.removeEventListener("dataavailable", onData);
          resolve();
        }, 400);
      });
    }

    if (chunksRef.current.length === 0) return audioFileIdRef.current;

    const blob = new Blob(chunksRef.current, {
      type: mimeRef.current,
    });
    if (blob.size === 0) return audioFileIdRef.current;

    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    const meta = await putBlob(
      blob,
      `capture-${Date.now()}.${ext}`,
      blob.type || mimeRef.current,
    );
    // Keep older autosave blobs in the vault (never delete) — just point to latest
    audioFileIdRef.current = meta.id;
    return meta.id;
  }

  async function runAutosave() {
    try {
      const audioFileId = await snapshotAudio();
      const transcript = liveRef.current.trim();
      const mins = Math.floor(secondsRef.current / 60);
      const secs = secondsRef.current % 60;
      const title = `${contextRef.current} · ${mins}m ${secs}s (autosaved)`;
      await persistDraft({
        title,
        transcript,
        body: "In progress — autosaved. Stop recording when finished.",
        audioFileId,
      });
      const stamp = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastAutosave(stamp);
      setStatus(`Autosaved at ${stamp}. Safe if the tab closes.`);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Autosave failed — still recording.",
      );
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      mimeRef.current = pickMime();
      audioFileIdRef.current = undefined;

      const draftId = addCapture({
        kind: "recording",
        title: `${context} · recording…`,
        body: "Recording in progress — autosaves every few minutes.",
        context,
        permissionConfirmed: true,
        transcript: "",
      });
      draftIdRef.current = draftId;

      const recorder = new MediaRecorder(stream, { mimeType: mimeRef.current });
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      secondsRef.current = 0;
      setLiveTranscript("");
      liveRef.current = "";
      setLastAutosave(null);

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
                "Recording. Live transcript unavailable — edit after.",
            );
          },
        );
        setStatus("Recording + live transcript. Autosaves every 3 min.");
      } else {
        speechRef.current = null;
        setStatus("Recording. Autosaves every 3 min.");
      }

      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          secondsRef.current = next;
          return next;
        });
      }, 1000);

      autosaveRef.current = window.setInterval(() => {
        void runAutosave();
      }, AUTOSAVE_MS);
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
    if (autosaveRef.current) {
      window.clearInterval(autosaveRef.current);
      autosaveRef.current = null;
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
    const mins = Math.floor(secondsRef.current / 60);
    const secs = secondsRef.current % 60;
    const title = `${context} · ${mins}m ${secs}s`;

    let audioFileId = audioFileIdRef.current;
    try {
      if (blob && blob.size > 0) {
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const meta = await putBlob(
          blob,
          `capture-${Date.now()}.${ext}`,
          blob.type || mimeRef.current,
        );
        audioFileId = meta.id;
        audioFileIdRef.current = meta.id;
      }
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Could not save audio file.",
      );
      setSaving(false);
      return;
    }

    const id = draftIdRef.current;
    if (id) {
      updateCapture(id, {
        title,
        body: transcript
          ? "Recording saved. Transcript from live capture — edit if needed."
          : "Recording saved. Add or fix the transcript below.",
        transcript,
        audioFileId,
        context,
      });
    } else {
      addCapture({
        kind: "recording",
        title,
        body: "Recording saved.",
        context,
        permissionConfirmed: true,
        transcript,
        audioFileId,
      });
    }

    draftIdRef.current = null;
    setStatus(
      audioFileId
        ? "Saved. Use Listen on the card to replay."
        : "Saved note (no audio blob).",
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
        eyebrow="Capture"
        title="Capture"
        blurb="Notes and recordings — kept forever, autosaved while you record."
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
            <button
              type="button"
              className="btn"
              onClick={() => !recording && setMode("hub")}
              disabled={recording}
            >
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
              <h3>Record</h3>
              <p>Start immediately. Autosaves every 3 minutes.</p>
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
          <h2 className="panel-title">Record</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Hit start — no checklist. Audio + transcript autosave every 3
            minutes so a closed tab doesn’t wipe the session. Captures are
            never deleted from the app.
          </p>

          <label className="field">
            <span>Label</span>
            <select
              value={context}
              disabled={recording || saving}
              onChange={(e) => setContext(e.target.value)}
            >
              <option>Mentor meeting</option>
              <option>Training / ITAP session</option>
              <option>Self practice / rehearsal</option>
              <option>Other session</option>
            </select>
          </label>

          <div className="record-status">
            <div className={`record-dot${recording ? " live" : ""}`} aria-hidden />
            <span className="record-timer">
              {recording ? `${mm}:${ss}` : "Ready"}
            </span>
          </div>

          {lastAutosave ? (
            <p className="hint">Last autosave: {lastAutosave}</p>
          ) : null}

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
              disabled={saving}
            >
              Start recording
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                onClick={() => void runAutosave()}
                disabled={saving}
              >
                Save now
              </button>
              <button
                type="button"
                className="btn btn-primary btn-clay"
                onClick={stopRecording}
                disabled={saving}
              >
                {saving ? "Saving…" : "Stop & save"}
              </button>
            </div>
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
            ? "Play below, then edit notes / transcript. Captures can’t be deleted."
            : "Captures can’t be deleted — edit instead."
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
          },
        ]}
        onClose={() => setEditing(null)}
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
