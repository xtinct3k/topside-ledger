import { useState } from "react";
import { motion } from "framer-motion";
import { setPass } from "../api";
import { rise, stagger } from "../motion";
import { connect, useSync } from "../sync";
import { Mark } from "./Nav";

export function Login() {
  const { phase, message } = useSync();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = phase === "unconfigured";

  return (
    <main className="gate">
      <motion.div className="gate-card" initial="hidden" animate="show" variants={stagger}>
        <motion.div variants={rise}>
          <Mark />
        </motion.div>
        <motion.h1 className="title" variants={rise}>
          <span>Topside</span>
          <span className="accent">Ledger</span>
        </motion.h1>
        {setup ? (
          <motion.div variants={rise} className="gate-setup">
            <p className="k">Almost there</p>
            <p>{message}</p>
            <button type="button" className="act" onClick={() => void connect()}>
              Try again
            </button>
          </motion.div>
        ) : (
          <motion.form
            variants={rise}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!pw) return;
              setBusy(true);
              setPass(pw);
              await connect();
              setBusy(false);
            }}
          >
            <label className="k" htmlFor="pw">
              Password
            </label>
            <input id="pw" className="text" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            {message && <p className="gate-err">{message}</p>}
            <button type="submit" className="act primary block" disabled={busy || !pw}>
              {busy ? "Unlocking…" : "Unlock"}
            </button>
            <p className="hint">Your progress is private. This device remembers the password until you lock it.</p>
          </motion.form>
        )}
      </motion.div>
    </main>
  );
}
