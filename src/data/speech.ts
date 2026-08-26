/**
 * Live speech → text while recording (Chrome / Edge / Safari).
 * Uses the Web Speech API — no cloud key required for this path.
 */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return !!getSpeechCtor();
}

export type LiveTranscriptSession = {
  stop: () => string;
};

/** Start continuous recognition; calls onUpdate with full final + interim text. */
export function startLiveTranscript(
  onUpdate: (full: string) => void,
  onError?: (message: string) => void,
): LiveTranscriptSession | null {
  const Ctor = getSpeechCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-GB";

  let finals = "";
  let stopped = false;

  recognition.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const piece = ev.results[i][0]?.transcript ?? "";
      if (ev.results[i].isFinal) {
        finals = `${finals}${piece} `.replace(/\s+/g, " ");
      } else {
        interim += piece;
      }
    }
    onUpdate(`${finals}${interim}`.trim());
  };

  recognition.onerror = (ev) => {
    if (ev.error === "aborted" || ev.error === "no-speech") return;
    onError?.(ev.error);
  };

  recognition.onend = () => {
    // Keep going until we explicitly stop (Chrome ends after silence)
    if (!stopped) {
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    }
  };

  try {
    recognition.start();
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "Speech start failed");
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
      return finals.trim();
    },
  };
}
