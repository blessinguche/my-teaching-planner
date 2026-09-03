import { useState } from "react";
import { SETUP_SQL } from "../data/accountSync";
import { useStore } from "../data/store";

export function SetupSqlBlock() {
  const [copied, setCopied] = useState(false);

  async function copySql() {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="sync-sql">
      <div className="sync-sql-actions">
        <button type="button" className="btn btn-primary btn-clay" onClick={() => void copySql()}>
          {copied ? "Copied" : "Copy SQL"}
        </button>
        <a
          className="btn"
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
        >
          Open Supabase
        </a>
      </div>
      <pre className="sync-sql-pre">{SETUP_SQL}</pre>
    </div>
  );
}

export function SyncBanner() {
  const { syncStatus, syncError, retrySync } = useStore();

  if (syncStatus === "synced" || syncStatus === "syncing") return null;

  if (syncStatus === "offline") {
    return (
      <section className="panel clay-panel sync-banner">
        <h2 className="panel-title">Account sync paused</h2>
        <p className="muted">
          Changes are kept on this device. {syncError ?? "Could not reach your account."}
        </p>
        <button type="button" className="btn btn-primary btn-clay" onClick={retrySync}>
          Retry sync
        </button>
      </section>
    );
  }

  return (
    <section className="panel clay-panel sync-banner">
      <h2 className="panel-title">One-time account setup</h2>
      <p className="muted">
        To-do, Learn notes, Due, Quiz progress and Remember pins need a table on
        your Supabase project. Paste this into SQL Editor → Run, then retry.
        Captures stay on this device.
      </p>
      <SetupSqlBlock />
      <button
        type="button"
        className="btn btn-primary btn-clay"
        style={{ marginTop: "0.75rem" }}
        onClick={retrySync}
      >
        I’ve run the SQL — retry
      </button>
    </section>
  );
}
