"use client";
import { useState } from "react";

type Action = "login" | "register";

export function AccountAuth() {
  const [action, setAction] = useState<Action>("login");
  const [email, setEmail] = useState("alex.morgan@example.com");
  const [password, setPassword] = useState("Password123!");
  const [firstName, setFirstName] = useState("Alex");
  const [lastName, setLastName] = useState("Morgan");
  const [state, setState] = useState("");

  async function submit() {
    setState(`${action === "login" ? "Logging in" : "Registering"}…`);
    const response = await fetch(`/api/customer/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setState(data.error || "Customer request failed");
      return;
    }
    setState(
      data.training
        ? `Training customer ready: ${data.customer.email}`
        : `Live customer ready: ${data.customer.email}`,
    );
  }

  return (
    <section className="panel">
      <span className="eyebrow">Customer API</span>
      <h2>Login / register</h2>
      <div className="steps">
        <button
          className={`step ${action === "login" ? "on" : ""}`}
          onClick={() => setAction("login")}
        >
          Login
        </button>
        <button
          className={`step ${action === "register" ? "on" : ""}`}
          onClick={() => setAction("register")}
        >
          Register
        </button>
      </div>
      <div className="form-grid">
        <input
          className="field wide"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
        />
        <input
          className="field wide"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        {action === "register" && (
          <>
            <input
              className="field"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
            />
            <input
              className="field"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Last name"
            />
          </>
        )}
      </div>
      <button className="button accent" onClick={submit}>
        {action === "login" ? "Login customer" : "Register customer"} →
      </button>
      <p className="muted">{state}</p>
    </section>
  );
}
