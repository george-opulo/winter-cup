"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card" style={{ maxWidth: 380 }}>
      <h3>Admin</h3>
      <p className="sub">Enter the PIN to manage scores, rounds and players.</p>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="btn" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
