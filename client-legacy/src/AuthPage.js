import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const TABS = ["sign-in", "sign-up", "magic-link", "reset"];
const TAB_LABELS = { "sign-in": "Sign In", "sign-up": "Sign Up", "magic-link": "Magic Link", "reset": "Reset Password" };

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "var(--color-red)" };
  if (score === 2) return { score, label: "Fair",   color: "#f0a500" };
  if (score === 3) return { score, label: "Good",   color: "#7ec8a0" };
  return              { score, label: "Strong", color: "var(--color-green)" };
}

function validatePassword(pw) {
  if (pw.length < 8)          return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))      return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(pw))      return "Password must include at least one number.";
  return null;
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="pw-strength">
      <div className="pw-strength-bars">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="pw-strength-bar"
            style={{ background: i <= score ? color : "var(--border)" }}
          />
        ))}
      </div>
      <span className="pw-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

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
        const pwError = validatePassword(password);
        if (pwError) throw new Error(pwError);
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
        const pwError = validatePassword(password);
        if (pwError) throw new Error(pwError);
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
            <input className="auth-input" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={password} onChange={e => setPassword(e.target.value)} required />
            <PasswordStrengthBar password={password} />
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
                placeholder={tab === "sign-up" ? "Min 8 chars, 1 uppercase, 1 number" : "Your password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {tab === "sign-up" && <PasswordStrengthBar password={password} />}
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
