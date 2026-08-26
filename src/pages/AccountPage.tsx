import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/AddDialog";
import { useAuth } from "../auth/AuthProvider";

export function AccountPage() {
  const {
    configured,
    ready,
    user,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    setStatus("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  async function handleMagic(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus("");
    try {
      await signInWithMagicLink(email);
      setStatus("Check your email for the magic link.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Your account"
        title="Account"
        blurb="Sign in so planner data, uploads, and captures can sync across devices."
      />

      {!ready ? <p className="muted">Checking session…</p> : null}

      {!configured ? (
        <section className="panel clay-panel" style={{ maxWidth: 560 }}>
          <h2 className="panel-title">Not connected yet</h2>
          <p className="muted">
            Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>),
            enable Google in the Supabase dashboard, then redeploy. Until then
            the app keeps working on this device via local storage.
          </p>
        </section>
      ) : null}

      {configured && user ? (
        <section className="panel clay-panel" style={{ maxWidth: 560 }}>
          <h2 className="panel-title">Signed in</h2>
          <p>
            <strong>{user.email ?? user.id}</strong>
          </p>
          <p className="hint" style={{ margin: "0.5rem 0 1rem" }}>
            Cloud sync of glossary / todos / files is next — you’re authenticated.
          </p>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out
          </button>
        </section>
      ) : null}

      {configured && !user && ready ? (
        <section className="panel clay-panel" style={{ maxWidth: 560 }}>
          <h2 className="panel-title">Sign in</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Private account for you only — Google OAuth or email magic link.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-clay"
            disabled={busy}
            onClick={handleGoogle}
          >
            Continue with Google
          </button>

          <form className="dialog-form" style={{ marginTop: "1.25rem" }} onSubmit={handleMagic}>
            <label className="field">
              <span>Or magic link</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                disabled={busy}
              />
            </label>
            <button type="submit" className="btn" disabled={busy}>
              Email me a link
            </button>
          </form>
        </section>
      ) : null}

      {status ? (
        <p className="hint" style={{ marginTop: "1rem" }}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
