import { useState } from "react";
import { setPass } from "../api";
import { connect, useSync } from "../sync";

export function Login() {
  const { phase, message } = useSync();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = phase === "unconfigured";

  return (
    <main className="gate">
      <div className="gate-card">
        <span className="code">[ ACCESS ]</span>
        <h1>
          Topside
          <br />
          Ledger
        </h1>
        {setup ? (
          <div className="gate-body">
            <p className="lbl">Setup needed</p>
            <p>{message}</p>
            <button type="button" className="btn" onClick={() => void connect()}>
              Try again
            </button>
          </div>
        ) : (
          <form
            className="gate-body"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!pw) return;
              setBusy(true);
              setPass(pw);
              await connect();
              setBusy(false);
            }}
          >
            <label className="lbl" htmlFor="pw">
              Password
            </label>
            <input id="pw" className="text" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            {message && <p className="err">{message}</p>}
            <button type="submit" className="btn hot wide" disabled={busy || !pw}>
              {busy ? "Unlocking…" : "Unlock"}
            </button>
            <p className="fine">Your progress is private. This device remembers the password until you lock it.</p>
          </form>
        )}
      </div>
    </main>
  );
}
