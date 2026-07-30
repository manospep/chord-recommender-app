import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut, getFavorites, removeFavorite, getList, removeFromList } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();

  const [displayName, setDisplayName] = useState("");
  const [favorites, setFavorites]     = useState([]);
  const [toLearnList, setToLearnList] = useState([]);
  const [learnedList, setLearnedList] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab]     = useState("account");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (profile) setDisplayName(profile.display_name || "");
    getFavorites().then(setFavorites);
    getList("to_learn").then(setToLearnList);
    getList("learned").then(setLearnedList);
  }, [user, profile]); // eslint-disable-line

  const handleSaveProfile = useCallback(async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await updateProfile({ display_name: displayName });
    toast(error ? error.message : "Profile saved!", error ? "error" : "success");
    setSavingProfile(false);
  }, [displayName, updateProfile, toast]);

  const handleUnfavorite = useCallback(async (songId) => {
    await removeFavorite(songId);
    setFavorites(f => f.filter(s => s.song_id !== songId));
    toast("Removed from favorites", "success", 2000);
  }, [removeFavorite, toast]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  return (
    <div className="page">
      <div className="profile-container">

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

        <div className="profile-tabs">
          {["account", "favorites", "to_learn", "learned"].map(t => (
            <button
              key={t}
              className={`profile-tab ${activeTab === t ? "profile-tab-active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t === "account"    ? "Account"
               : t === "favorites" ? `Favorites (${favorites.length})`
               : t === "to_learn"  ? `To Learn (${toLearnList.length})`
               :                     `Learned (${learnedList.length})`}
            </button>
          ))}
        </div>

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

        {activeTab === "favorites" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Saved songs</h3>
            {favorites.length === 0 ? (
              <p className="profile-hint">No favorites yet. Hit the ♡ button on any song page to save it here.</p>
            ) : (
              <div className="favorites-list">
                {favorites.map(song => (
                  <div key={song.song_id} className="favorite-item">
                    <Link to={`/song/${song.song_id}`} className="favorite-link">
                      <span className="favorite-title">{song.artist_name} — {song.song_name}</span>
                      {song.genre && song.genre !== "Other" && <span className="genre-badge">{song.genre}</span>}
                    </Link>
                    <button className="unfavorite-btn" onClick={() => handleUnfavorite(song.song_id)} title="Remove from favorites">♥</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "to_learn" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Songs to learn</h3>
            {toLearnList.length === 0 ? (
              <p className="profile-hint">No songs queued yet. Hit "📖 To Learn" on any song page to add it here.</p>
            ) : (
              <div className="favorites-list">
                {toLearnList.map(song => (
                  <div key={song.song_id} className="favorite-item">
                    <Link to={`/song/${song.song_id}`} className="favorite-link">
                      <span className="favorite-title">{song.artist_name} — {song.song_name}</span>
                      {song.genre && song.genre !== "Other" && <span className="genre-badge">{song.genre}</span>}
                    </Link>
                    <button
                      className="unfavorite-btn"
                      onClick={async () => {
                        await removeFromList(song.song_id, "to_learn");
                        setToLearnList(l => l.filter(s => s.song_id !== song.song_id));
                      }}
                      title="Remove"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "learned" && (
          <div className="profile-section">
            <h3 className="profile-section-title">Songs I've learned</h3>
            {learnedList.length === 0 ? (
              <p className="profile-hint">Nothing here yet. Hit "🎸 Learned" on any song page once you can play it!</p>
            ) : (
              <div className="favorites-list">
                {learnedList.map(song => (
                  <div key={song.song_id} className="favorite-item">
                    <Link to={`/song/${song.song_id}`} className="favorite-link">
                      <span className="favorite-title">{song.artist_name} — {song.song_name}</span>
                      {song.genre && song.genre !== "Other" && <span className="genre-badge">{song.genre}</span>}
                    </Link>
                    <button
                      className="unfavorite-btn"
                      onClick={async () => {
                        await removeFromList(song.song_id, "learned");
                        setLearnedList(l => l.filter(s => s.song_id !== song.song_id));
                      }}
                      title="Remove"
                    >×</button>
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
