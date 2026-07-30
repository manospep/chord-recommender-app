import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

function AuthPage() {
  const { user, signIn, signUp, signInMagicLink } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res =
        mode === "signin" ? await signIn(email, password)
        : mode === "signup" ? await signUp(email, password)
        : await signInMagicLink(email);
      if (res?.error) {
        toast(res.error.message ?? "Authentication failed", "error");
      } else if (mode === "magic") {
        toast("Check your inbox for the sign-in link");
      } else if (mode === "signup") {
        toast("Account created — you're signed in");
      } else {
        toast("Welcome back!");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Authentication failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home-page auth-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "3.5rem" }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="section-title">
            {mode === "signup" ? "Create your account" : mode === "magic" ? "Email me a link" : "Welcome back"}
          </h1>
          <p className="section-subtitle">Save favorites, rate songs, and keep your chord vocabulary in sync.</p>
        </div>

        <form onSubmit={submit} className="form-card">
          <input
            className="text-input"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-label="Email"
          />
          {mode !== "magic" && (
            <input
              className="text-input"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-label="Password"
            />
          )}
          <button className="search-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "magic" ? "Send link" : "Sign in"}
          </button>
        </form>

        <div className="progressions">
          <button type="button" className="progression-chip" onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className="progression-chip" onClick={() => setMode("signup")}>Create account</button>
          <button type="button" className="progression-chip" onClick={() => setMode("magic")}>Magic link</button>
        </div>
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In or Create an Account | ChordQuest" },
      { name: "description", content: "Sign in to ChordQuest to save favorite songs, rate chord charts, and keep your personal chord vocabulary in sync." },
      { property: "og:title", content: "Sign In or Create an Account | ChordQuest" },
      { property: "og:description", content: "Save favorites, rate songs, and sync your chord vocabulary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
