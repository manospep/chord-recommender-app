import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut, getFavorites, removeFavorite, loadChords, syncChords } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName]   = useState("");
  const [favorites, setFavorites]       = useState([]);
  const [chords, setChords]             = useState([]);
  const [saveMsg, setSaveMsg]           = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab]       = useState("account");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (profile) setDisplayName(profile.display_name || "");
    getFavorites().then(setFavorites);
    loadChords().then(loaded => {
      if (loaded.length > 0) setChords(loaded);
      else {
        // Fall back to localStorage
        const local = (localStorage.getItem("userChords") || "").split(",").filter(Boolean);
        setChords(local);
      }
    });
  }, [user, profile]); // eslint-disable-line

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await updateProfile({ display_name: displayName });
    setSaveMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Profile saved!" });
    setSavingProfile(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleSaveChords = async () => {
    await syncChords(chords);
    localStorage.setItem("userChords", chords.join(","));
    setSaveMsg({ type: "success", text: "Chords synced!" });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleUnfavorite = async (songId) => {
    await removeFavorite(songId);
    setFavorites(f => f.filter(s => s.song_id !== songId));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="page">
      <div className="profile-container">

        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {(profile?.display_name || user?.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <h1 className="profile-name">{profile?.display_name || user?.email}</h1>
            <p className="profile-email">{user?.email}</p>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {["account", "chords", "favorites"].map(t => (
            <button
              key={t}
              className={`profile-tab ${activeTab === t ? "profile-tab-active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t === "account" ? "Account" : t === "chords" ? `My Chords (${chords.length})` : `Favorites (${favorites.length})`}
            </button>
          ))}
        </div>

        {saveMsg && (
          <p className={`auth-msg auth-msg-${saveMsg.type}`} style={{ marginBottom: "16px" }}>
            {saveMsg.text}
          </p>
        )}

        {/* Account tab */}
        {activeTab === "account" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Profile</h3>
            <form onSubmit={handleSaveProfile} className="auth-form">
              <label className="auth-label">Display name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" value={user?.email} disabled />
              <button className="auth-submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Profile"}
              </button>
            </form>

            <h3 className="profile-section-title" style={{ marginTop: "32px" }}>Password</h3>
            <p className="profile-hint">To change your password, sign out and use "Forgot password?" on the sign-in page.</p>

            <h3 className="profile-section-title" style={{ marginTop: "32px", color: "var(--color-red)" }}>Danger zone</h3>
            <button className="danger-btn" onClick={handleSignOut}>Sign out of all devices</button>
          </div>
        )}

        {/* Chords tab */}
        {activeTab === "chords" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Your chord list</h3>
            <p className="profile-hint">These sync across all your devices when you're signed in.</p>
            <div className="profile-chords">
              {chords.map((ch, i) => (
                <span key={i} className="tag-chip">
                  {ch}
                  <button
                    className="tag-remove"
                    onClick={() => setChords(chords.filter((_, j) => j !== i))}
                  >×</button>
                </span>
              ))}
              {chords.length === 0 && (
                <p className="profile-hint">No chords saved yet. Search for songs on the home page and they'll appear here.</p>
              )}
            </div>
            <button className="auth-submit" style={{ marginTop: "16px", maxWidth: "200px" }} onClick={handleSaveChords}>
              Sync chords
            </button>
          </div>
        )}

        {/* Favorites tab */}
        {activeTab === "favorites" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Saved songs</h3>
            {favorites.length === 0 ? (
              <p className="profile-hint">
                No favorites yet. Hit the ♡ button on any song page to save it here.
              </p>
            ) : (
              <div className="favorites-list">
                {favorites.map(song => (
                  <div key={song.song_id} className="favorite-item">
                    <Link to={`/song/${song.song_id}`} className="favorite-link">
                      <span className="favorite-title">{song.artist_name} — {song.song_name}</span>
                      {song.genre && song.genre !== "Other" && (
                        <span className="genre-badge">{song.genre}</span>
                      )}
                    </Link>
                    <button
                      className="unfavorite-btn"
                      onClick={() => handleUnfavorite(song.song_id)}
                      title="Remove from favorites"
                    >♥</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
