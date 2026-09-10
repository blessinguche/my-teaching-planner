import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SetupSqlBlock } from "../components/SyncBanner";
import { PaperPage, Sheet } from "../components/PlannerUI";
import { useAuth } from "../auth/AuthProvider";
import { fetchAccountCloud } from "../data/accountSync";

type Mode = "signin" | "signup" | "reset";

function AccountField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="planner-row account-field-row">
      <div className="planner-label-cell">{label}</div>
      <div className="planner-cell account-field-cell">{children}</div>
    </div>
  );
}

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
      <PaperPage title="Account" caption="Your account · sign-in & sync">
        <p className="muted">Checking session…</p>
      </PaperPage>
    );
  }

  const authTitle =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : "Reset password";

  return (
    <PaperPage
      title="Account"
      caption="Email + password · synced planner data"
      actions={
        user ? (
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
        ) : undefined
      }
    >
      <p className="account-lede">
        To-do, Learn, Due and Quiz follow this account. Captures stay on the
        device you recorded them on.
      </p>

      {!configured ? (
        <>
          <h2 className="planner-heading">Not connected yet</h2>
          <Sheet className="account-table">
            <div className="account-sheet-pad">
              <p className="muted" style={{ margin: 0 }}>
                Add <code>VITE_SUPABASE_URL</code> and{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> (see{" "}
                <code>.env.example</code>), enable Email auth in Supabase, then
                restart / redeploy.
              </p>
            </div>
          </Sheet>
        </>
      ) : null}

      {configured && user ? (
        <>
          {passwordRecovery ? (
            <div className="account-block">
              <h2 className="planner-heading">Set a new password</h2>
              <Sheet className="account-table">
                <p className="account-sheet-pad muted" style={{ margin: 0 }}>
                  You’re in from the reset link — choose a new password below.
                </p>
                <form className="account-form" onSubmit={handleChangePassword}>
                  <div className="planner-grid joined">
                    <AccountField label="New password">
                      <input
                        className="planner-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={busy}
                        autoComplete="new-password"
                        autoFocus
                      />
                    </AccountField>
                    <AccountField label="Confirm">
                      <input
                        className="planner-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={busy}
                        autoComplete="new-password"
                      />
                    </AccountField>
                  </div>
                  <div className="account-sheet-actions">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? "Saving…" : "Save new password"}
                    </button>
                  </div>
                </form>
              </Sheet>
            </div>
          ) : null}

          <div className="account-block">
            <h2 className="planner-heading">Signed in</h2>
            <Sheet className="account-table">
              <div className="planner-grid joined">
                <AccountField label="Email">
                  <div className="account-value">{user.email ?? user.id}</div>
                </AccountField>
              </div>
            </Sheet>
            <p className="account-sync-note">
              Programme content (calendar, shared Learn cards, due dates) is the
              same on every device. Your To-do list, Remember pins, Learn notes,
              Due check-offs, Quiz progress and anything you add yourself sync
              with this account. Captures and recordings stay on this device
              only.
            </p>
          </div>

          {needsSetup ? (
            <div className="account-block">
              <h2 className="planner-heading">Link sync to this account</h2>
              <Sheet className="account-table">
                <div className="account-sheet-pad account-setup">
                  <p className="muted">
                    Run this once in Supabase → SQL Editor, then open the planner.
                  </p>
                  <SetupSqlBlock />
                </div>
              </Sheet>
            </div>
          ) : null}

          {!passwordRecovery ? (
            <div className="account-block">
              <h2 className="planner-heading">Change password</h2>
              <Sheet className="account-table">
                <form className="account-form" onSubmit={handleChangePassword}>
                  <div className="planner-grid joined">
                    <AccountField label="New password">
                      <input
                        className="planner-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={busy}
                        autoComplete="new-password"
                      />
                    </AccountField>
                    <AccountField label="Confirm">
                      <input
                        className="planner-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={busy}
                        autoComplete="new-password"
                      />
                    </AccountField>
                  </div>
                  <div className="account-sheet-actions">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? "Saving…" : "Update password"}
                    </button>
                  </div>
                </form>
              </Sheet>
            </div>
          ) : null}

          <div className="account-block account-open-row">
            <Link className="btn btn-primary" to="/">
              Open teaching planner
            </Link>
          </div>
        </>
      ) : null}

      {configured && !user ? (
        <>
          <div className="account-mode-row" role="tablist" aria-label="Account mode">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create"],
                ["reset", "Forgot"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                className={`btn${mode === id ? " is-active-soft" : ""}`}
                onClick={() => {
                  setMode(id);
                  setStatus("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="planner-heading">{authTitle}</h2>
          <Sheet className="account-table">
            <p className="account-sheet-pad muted" style={{ margin: 0 }}>
              Use your Google email if you like — this is a normal email +
              password login (no Google button).
            </p>
            <form className="account-form" onSubmit={handleSubmit}>
              <div className="planner-grid joined">
                <AccountField label="Email">
                  <input
                    className="planner-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    required
                    disabled={busy}
                    autoComplete="email"
                  />
                </AccountField>
                {mode !== "reset" ? (
                  <AccountField label="Password">
                    <input
                      className="planner-input"
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
                  </AccountField>
                ) : null}
              </div>
              <div className="account-sheet-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy
                    ? "Working…"
                    : mode === "signin"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset email"}
                </button>
              </div>
            </form>
          </Sheet>
        </>
      ) : null}

      {status ? <p className="account-status">{status}</p> : null}
    </PaperPage>
  );
}
