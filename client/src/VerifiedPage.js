import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function VerifiedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) {
          clearInterval(timer);
          navigate("/");
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="page">
      <div className="verified-card">
        <div className="verified-icon">✓</div>
        <h1 className="verified-title">You're verified!</h1>
        <p className="verified-sub">
          {user
            ? `Welcome to ChordQuest, ${user.email}.`
            : "Your email has been confirmed."}
        </p>
        <p className="verified-redirect">
          Taking you home in {countdown}…
        </p>
        <button className="auth-submit" style={{ maxWidth: "200px", margin: "0 auto" }} onClick={() => navigate("/")}>
          Go now
        </button>
      </div>
    </div>
  );
}
