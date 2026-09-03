import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/AddDialog";
import { SetupSqlBlock } from "../components/SyncBanner";
import { useAuth } from "../auth/AuthProvider";
import { fetchAccountCloud } from "../data/accountSync";

type Mode = "signin" | "signup" | "reset";

export function AccountPage() {
  const {
    configured,
    ready,
    user,
    passwordRecovery,
    clearPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    signOut,
  } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus("");
    try {
      if (mode === "signin") {
        await signInWithPassword(email, password);
        setStatus("Signed in.");
      } else if (mode === "signup") {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const msg = await signUpWithPassword(email, password);
        setStatus(msg);
      } else {
        await resetPassword(email);
        setStatus("Password reset email sent — check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords don’t match.");
      }
      await updatePassword(newPassword);
      clearPasswordRecovery();
      setNewPassword("");
      setConfirmPassword("");
      setStatus("Password updated. You can use it next time you sign in.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setNeedsSetup(false);
      return;
    }
    let cancelled = false;
    fetchAccountCloud(user.id).then((result) => {
      if (!cancelled) setNeedsSetup(result.kind === "missing-table");
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!ready) {
    return (
      <div className="module-page page-enter">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="module-page page-enter" style={{ maxWidth: 560, margin: "0 auto" }}>
      <PageHeader
        eyebrow="Your account"
        title="Account"
        blurb="Email + password. To-do, Learn, Due and Quiz follow this account. Captures stay on the device you recorded them on."
      />

      {!configured ? (
        <section className="panel clay-panel">
          <h2 className="panel-title">Not connected yet</h2>
          <p className="muted">
            Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>),
            enable Email auth in Supabase, then restart / redeploy.
          </p>
        </section>
      ) : null}

      {configured && user ? (
        <>
          {passwordRecovery ? (
            <section className="panel clay-panel" style={{ marginBottom: "1rem" }}>
              <h2 className="panel-title">Set a new password</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                You’re in from the reset link — choose a new password below.
              </p>
              <form className="dialog-form" onSubmit={handleChangePassword}>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={busy}
                    autoComplete="new-password"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary btn-clay"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save new password"}
                </button>
              </form>
            </section>
          ) : null}

          <section className="panel clay-panel">
            <h2 className="panel-title">Signed in</h2>
            <p>
              <strong>{user.email ?? user.id}</strong>
            </p>
            <p className="hint" style={{ margin: "0.5rem 0 1rem" }}>
              Programme content (calendar, shared Learn cards, due dates) is the
              same on every device. Your To-do list, Remember pins, Learn notes,
              Due check-offs, Quiz progress and anything you add yourself sync
              with this account. Captures and recordings stay on this device
              only.
            </p>

            {needsSetup ? (
              <div style={{ marginBottom: "1rem" }}>
                <h3 className="section-label">Link To-do / Learn / Due to this account</h3>
                <p className="muted">
                  Run this once in Supabase → SQL Editor, then open the planner.
                </p>
                <SetupSqlBlock />
              </div>
            ) : null}

            {!passwordRecovery ? (
              <form
                className="dialog-form"
                style={{ marginBottom: "1rem" }}
                onSubmit={handleChangePassword}
              >
                <h3 className="section-label">Change password</h3>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving…" : "Update password"}
                </button>
              </form>
            ) : null}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link className="btn btn-primary btn-clay" to="/">
                Open teaching planner
              </Link>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signOut();
                    setStatus("Signed out.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Sign out
              </button>
            </div>
          </section>
        </>
      ) : null}

      {configured && !user ? (
        <section className="panel clay-panel">
          <h2 className="panel-title">
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Reset password"}
          </h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Use your Google email if you like — this is a normal email +
            password login (no Google button).
          </p>

          <form className="dialog-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
                disabled={busy}
                autoComplete="email"
              />
            </label>
            {mode !== "reset" ? (
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={busy}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={6}
                />
              </label>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary btn-clay"
              disabled={busy}
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset email"}
            </button>
          </form>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginTop: "1rem",
            }}
          >
            {mode !== "signin" ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMode("signin");
                  setStatus("");
                }}
              >
                Sign in
              </button>
            ) : null}
            {mode !== "signup" ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMode("signup");
                  setStatus("");
                }}
              >
                Create account
              </button>
            ) : null}
            {mode !== "reset" ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMode("reset");
                  setStatus("");
                }}
              >
                Forgot password
              </button>
            ) : null}
          </div>
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
