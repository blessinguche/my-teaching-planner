import { useEffect, useState } from "react";
import { createFileObjectUrl } from "../data/fileStore";

/** Loads vault audio by id and shows a native player. */
export function CaptureAudioPlayer({
  fileId,
  className,
}: {
  fileId: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setError(null);
      setUrl(null);
      try {
        const next = await createFileObjectUrl(fileId);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setUrl(next);
      } catch {
        if (!cancelled) setError("Could not load audio.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (error) return <p className="form-error">{error}</p>;
  if (!url) return <p className="hint">Loading audio…</p>;

  return (
    <audio
      controls
      preload="metadata"
      src={url}
      className={className ?? "capture-audio"}
    />
  );
}
