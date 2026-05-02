import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const TABS = ["sign-in", "sign-up", "magic-link", "reset"];
const TAB_LABELS = { "sign-in": "Sign In", "sign-up": "Sign Up", "magic-link": "Magic Link", "reset": "Reset Password" };

export default function AuthPage() {
  const { signIn, signUp, signInMagicLink, resetPassword, updatePassword, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isResetFlow = location.hash.includes("type=recovery");
  const [tab, setTab]           = useState(isResetFlow ? "update-password" : "sign-in");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [message, setMessage]   = useState(null); // { type: "success"|"error", text }
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    if (user && !isResetFlow) navigate("/");
  }, [user, isResetFlow, navigate]);

  const clearMessage = () => setMessage(null);

  const handle = async (e) => {
    e.preventDefault();
    setBusy(true);
    clearMessage();

    try {
      if (tab === "sign-in") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/");

      } else if (tab === "sign-up") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage({ type: "success", text: "Account created! Check your email to confirm your address." });

      } else if (tab === "magic-link") {
        const { error } = await signInMagicLink(email);
        if (error) throw error;
        setMessage({ type: "success", text: "Magic link sent! Check your inbox." });

      } else if (tab === "reset") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage({ type: "success", text: "Reset link sent! Check your inbox." });

      } else if (tab === "update-password") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { error } = await updatePassword(password);
        if (error) throw error;
        setMessage({ type: "success", text: "Password updated! Redirecting…" });
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }

    setBusy(false);
  };

  if (tab === "update-password") {
    return (
      <div className="page">
        <div className="auth-card">
          <h2 className="auth-title">Set New Password</h2>
          <form onSubmit={handle} className="auth-form">
            <label className="auth-label">New password</label>
            <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <label className="auth-label">Confirm password</label>
            <input className="auth-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            {message && <p className={`auth-msg auth-msg-${message.type}`}>{message.text}</p>}
            <button className="auth-submit" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="auth-card">
        <h2 className="auth-title">
          {tab === "sign-in" ? "Welcome back" : tab === "sign-up" ? "Create account" : tab === "magic-link" ? "Passwordless sign in" : "Reset password"}
        </h2>

        {/* Tabs */}
        <div className="auth-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`auth-tab ${tab === t ? "auth-tab-active" : ""}`}
              onClick={() => { setTab(t); clearMessage(); }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handle} className="auth-form">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {(tab === "sign-in" || tab === "sign-up") && (
            <>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder={tab === "sign-up" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </>
          )}

          {tab === "sign-up" && (
            <>
              <label className="auth-label">Confirm password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </>
          )}

          {message && (
            <p className={`auth-msg auth-msg-${message.type}`}>{message.text}</p>
          )}

          <button className="auth-submit" disabled={busy}>
            {busy ? "Please wait…" : (
              tab === "sign-in"     ? "Sign In" :
              tab === "sign-up"     ? "Create Account" :
              tab === "magic-link"  ? "Send Magic Link" :
                                     "Send Reset Link"
            )}
          </button>

          {tab === "sign-in" && (
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => { setTab("reset"); clearMessage(); }}
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
